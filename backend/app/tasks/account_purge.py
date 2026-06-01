"""B7 P9 — Celery beat task that hard-purges accounts past their grace window.

Runs daily at 03:00 UTC. For every user with `purge_at <= now()` and
`deleted_at IS NOT NULL`:
  1. Anonymize the user's audit log entries (replace PII with hashes; keep
     event sequence so security investigations remain possible).
  2. Cascade-delete the user row (FKs on owned tables drop cascade-deletes
     of meals, vitals, reminders, appointments, conversations, etc.).
  3. Insert a final `account_purged` audit log with no `user_id` (anonymous).
"""
from __future__ import annotations

import datetime
import hashlib
import logging
from sqlalchemy import select
from urllib.parse import urlparse

from app.adapters.database import get_sync_db_context
from app.adapters.storage import delete_object
from app.core.config import settings
from app.core.metrics import record_account_purge, record_export_blob_bytes
from app.models.audit import AuditEventTypeEnum, AuditLog
from app.models.core import (
    AppointmentAsset,
    DataExportRequest,
    Meal,
    PrescriptionAsset,
    ReportExportRequest,
    User,
)
from app.tasks import celery_app

logger = logging.getLogger(__name__)


def _safe_delete(bucket: str | None, key: str | None) -> bool:
    if not bucket or not key:
        return False
    try:
        delete_object(bucket, key)
        return True
    except Exception:
        logger.exception("Failed to delete %s/%s during purge", bucket, key)
        return False


def _meal_image_to_bucket_key(image_url: str) -> tuple[str, str] | None:
    """Best-effort: derive (bucket, key) from a stored `Meal.image_url`.

    `upload_file` returns `f"{settings.storage_endpoint}/{bucket}/{key}"`.
    We strip the endpoint, then split bucket/key. Returns None if the URL
    doesn't look like ours (e.g. legacy or external hosting).
    """
    if not image_url:
        return None
    try:
        parsed = urlparse(image_url)
        if parsed.scheme not in {"http", "https"}:
            return None
        path = parsed.path.lstrip("/")
        if "/" not in path:
            return None
        bucket, key = path.split("/", 1)
        if bucket != settings.storage_bucket_meals:
            return None
        return bucket, key
    except Exception:
        return None


def _purge_user_blobs(db, user_id) -> int:
    """B7 review P1-3 — enumerate owned MinIO objects before the FK cascade.

    The FK cascade removes rows but not the underlying bytes — leaving PHI
    in object storage indefinitely. We delete in this order:
      1. prescription and generic appointment assets
      2. meal photos (parsed from `Meal.image_url`)
      3. data export tarballs (`data_export_requests.bucket/key`)
      4. PDF report blobs (`report_export_requests.bucket/key`)
    Returns total objects deleted.
    """
    deleted = 0

    # 1. Prescription assets — join via appointments to the user.
    from app.models.core import Appointment  # local import avoids cycle on module load
    asset_rows = db.execute(
        select(PrescriptionAsset.bucket, PrescriptionAsset.key)
        .join(Appointment, Appointment.id == PrescriptionAsset.appointment_id)
        .where(Appointment.user_id == user_id)
    ).all()
    for bucket, key in asset_rows:
        if _safe_delete(bucket, key):
            deleted += 1

    generic_asset_rows = db.execute(
        select(AppointmentAsset.bucket, AppointmentAsset.key)
        .join(Appointment, Appointment.id == AppointmentAsset.appointment_id)
        .where(Appointment.user_id == user_id)
    ).all()
    for bucket, key in generic_asset_rows:
        if _safe_delete(bucket, key):
            deleted += 1

    # 2. Meal photos.
    meal_rows = db.execute(
        select(Meal.image_url).where(Meal.user_id == user_id, Meal.image_url.is_not(None))
    ).all()
    for (image_url,) in meal_rows:
        bk = _meal_image_to_bucket_key(image_url)
        if bk and _safe_delete(*bk):
            deleted += 1

    # 3. Data export tarballs (any status, even unexpired).
    export_rows = db.execute(
        select(DataExportRequest.bucket, DataExportRequest.key).where(
            DataExportRequest.user_id == user_id,
            DataExportRequest.bucket.is_not(None),
        )
    ).all()
    for bucket, key in export_rows:
        if _safe_delete(bucket, key):
            deleted += 1

    # 4. PDF report blobs.
    pdf_rows = db.execute(
        select(ReportExportRequest.bucket, ReportExportRequest.key).where(
            ReportExportRequest.user_id == user_id,
            ReportExportRequest.bucket.is_not(None),
        )
    ).all()
    for bucket, key in pdf_rows:
        if _safe_delete(bucket, key):
            deleted += 1

    return deleted


@celery_app.task(name="app.tasks.account_purge.purge_expired_accounts")
def purge_expired_accounts() -> dict:
    purged = 0
    skipped = 0
    blobs_deleted = 0
    now = datetime.datetime.now(datetime.timezone.utc)
    with get_sync_db_context() as db:
        users = db.execute(
            select(User).where(
                User.deleted_at.isnot(None),
                User.purge_at <= now,
            )
        ).scalars().all()
        for user in users:
            try:
                # B7 review P1-3 — wipe owned MinIO objects BEFORE the FK
                # cascade, so the bytes are gone even if a downstream cascade
                # delete strips the row pointers. Failures here are logged
                # but don't block the purge — the row removal still proceeds
                # so we don't loop on a permanently-stuck user.
                blobs_deleted += _purge_user_blobs(db, user.id)

                # Anonymize audit logs.
                logs = db.execute(
                    select(AuditLog).where(AuditLog.user_id == user.id)
                ).scalars().all()
                email_hash = hashlib.sha256(user.email.lower().encode("utf-8")).hexdigest()
                for log in logs:
                    details = log.details or {}
                    if isinstance(details, dict):
                        for k in ("email", "username", "ip_address"):
                            if k in details:
                                details[k] = "[redacted]"
                        details["email_hash"] = email_hash
                        log.details = details
                db.flush()

                # Final audit row — no user_id, just the hash.
                final_log = AuditLog(
                    user_id=None,
                    event_type=AuditEventTypeEnum.ACCOUNT_PURGED,
                    details={
                        "email_hash": email_hash,
                        "purged_at": now.isoformat(),
                        "blobs_deleted": blobs_deleted,
                    },
                )
                db.add(final_log)

                # Hard delete; FK cascades take care of owned table rows.
                db.delete(user)
                db.flush()
                purged += 1
                record_account_purge("purged")
            except Exception:  # noqa: BLE001
                logger.exception("Failed to purge user %s", user.id)
                db.rollback()
                skipped += 1
                record_account_purge("skipped")
    # We don't have per-user byte totals from `_purge_user_blobs` (it returns
    # object counts, not sizes), but the daily janitor records bytes precisely.
    # The counter here is just "blobs touched during purge" — useful for SLO.
    return {"purged": purged, "skipped": skipped, "blobs_deleted": blobs_deleted}


# B7 review P2-4 — beat schedule is registered once in `app/tasks/__init__.py`
# (single source of truth). Don't mutate `celery_app.conf.beat_schedule` here.

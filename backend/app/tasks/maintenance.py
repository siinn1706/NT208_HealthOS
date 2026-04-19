"""B7 review P1-3 — MinIO blob janitor.

Daily Celery beat sweeps two surfaces:

  * Expired data-export tarballs   — `data_export_requests.expires_at < now()`
  * Expired report-PDF blobs       — `report_export_requests.expires_at < now()`

For each row whose download window has lapsed, we delete the underlying
MinIO object (so PHI doesn't leak in object storage), null out the
`bucket`/`key` pointers, and bump the `status` to `expired` so the
download endpoint can return a useful 410 instead of a generic 404.

Account-level purge (the soft-delete grace expiry) lives in
`app.tasks.account_purge` — that task now also enumerates owned MinIO
objects (prescription assets, meal photos, prior export blobs) before
the FK cascade fires. This module is for the time-based blob expiry that
runs even on accounts that are still active.
"""
from __future__ import annotations

import datetime
import logging

from sqlalchemy import select, update

from app.adapters.database import get_sync_db_context
from app.adapters.storage import delete_object
from app.core.metrics import record_export_blob_bytes
from app.models.core import (
    DataExportRequest,
    DataExportStatusEnum,
    ReportExportRequest,
    User,
)
from app.models.emergency import EmergencyAccessLog, EmergencyShareToken
from app.tasks import celery_app

logger = logging.getLogger(__name__)


def _safe_delete(bucket: str | None, key: str | None) -> bool:
    """Best-effort delete; logs on failure so we don't bury MinIO outages."""
    if not bucket or not key:
        return False
    try:
        delete_object(bucket, key)
        return True
    except Exception:
        logger.exception("Failed to delete object %s/%s", bucket, key)
        return False


@celery_app.task(name="app.tasks.maintenance.expire_export_blobs")
def expire_export_blobs() -> dict:
    """Sweep expired data-export tarballs.

    Idempotent — re-running over already-cleaned rows is a no-op because
    `bucket` is set to NULL after a successful delete.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    deleted = 0
    with get_sync_db_context() as db:
        rows = db.execute(
            select(DataExportRequest)
            .where(
                DataExportRequest.expires_at <= now,
                DataExportRequest.bucket.is_not(None),
                DataExportRequest.status == DataExportStatusEnum.COMPLETED.value,
            )
            .limit(500)
        ).scalars().all()
        for req in rows:
            if _safe_delete(req.bucket, req.key):
                deleted += 1
                record_export_blob_bytes("data_export", req.bytes or 0)
            req.status = DataExportStatusEnum.EXPIRED.value
            req.bucket = None
            req.key = None
            db.flush()
    return {"deleted": deleted}


@celery_app.task(name="app.tasks.maintenance.purge_old_emergency_access_logs")
def purge_old_emergency_access_logs() -> dict:
    """Hard-delete emergency-card public access log rows older than 180 days.

    Retention rationale: 180d is enough for a user to spot a leaked-token
    scrape pattern and revoke; longer retention is gratuitous PHI-adjacent
    storage. The token row itself (and its `access_count` total) survives.
    """
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=180)
    deleted = 0
    with get_sync_db_context() as db:
        # Page through deletes to keep the lock window small on heavy days.
        while True:
            rows = db.execute(
                select(EmergencyAccessLog.id)
                .where(EmergencyAccessLog.accessed_at < cutoff)
                .limit(500)
            ).scalars().all()
            if not rows:
                break
            db.execute(
                EmergencyAccessLog.__table__.delete().where(
                    EmergencyAccessLog.id.in_(rows)
                )
            )
            db.commit()
            deleted += len(rows)
            if len(rows) < 500:
                break
    return {"deleted": deleted}


@celery_app.task(name="app.tasks.maintenance.revoke_tokens_for_soft_deleted_users")
def revoke_tokens_for_soft_deleted_users() -> dict:
    """Belt-and-braces — auto-revoke any active emergency token belonging to a
    user with `deleted_at IS NOT NULL`.

    The public endpoint already returns 410 for soft-deleted users
    (services/emergency_profile.load_card_source_data filters them), but we
    also want the audit picture to reflect the revocation explicitly so the
    owner-side `last_accessed_at` / `revoked_at` fields stay coherent if the
    user is restored.

    Idempotent — safe to run on every beat cycle.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    revoked = 0
    with get_sync_db_context() as db:
        rows = db.execute(
            select(EmergencyShareToken)
            .join(User, User.id == EmergencyShareToken.user_id)
            .where(
                User.deleted_at.is_not(None),
                EmergencyShareToken.revoked_at.is_(None),
            )
            .limit(500)
        ).scalars().all()
        for token in rows:
            token.revoked_at = now
            revoked += 1
        if revoked:
            db.commit()
    return {"revoked": revoked}


@celery_app.task(name="app.tasks.maintenance.expire_report_pdf_blobs")
def expire_report_pdf_blobs() -> dict:
    """Sweep expired PDF report blobs."""
    now = datetime.datetime.now(datetime.timezone.utc)
    deleted = 0
    with get_sync_db_context() as db:
        rows = db.execute(
            select(ReportExportRequest)
            .where(
                ReportExportRequest.expires_at <= now,
                ReportExportRequest.bucket.is_not(None),
                ReportExportRequest.status == "completed",
            )
            .limit(500)
        ).scalars().all()
        for req in rows:
            if _safe_delete(req.bucket, req.key):
                deleted += 1
                record_export_blob_bytes("report_pdf", req.bytes or 0)
            req.status = "expired"
            req.bucket = None
            req.key = None
            db.flush()
    return {"deleted": deleted}

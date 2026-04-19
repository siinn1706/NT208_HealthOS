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
)
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

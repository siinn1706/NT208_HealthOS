"""B7 P8 — Data export service.

Public API:
  * `request_export(db, user_id)` — creates a `data_export_requests` row in
    `pending` and returns it. The endpoint then `delay()`s the Celery task.
  * `get_request(db, user_id, request_id)` — owner-scoped fetch.
  * `mint_signed_download(asset)` — re-issues a fresh 5-minute presigned GET
    URL on each click (never persisted).

Rate limiting is enforced at the endpoint level (1 export per 24h per user).
"""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.storage import (
    DEFAULT_GET_EXPIRY_S,
    get_presigned_get_url,
)
from app.models.core import DataExportRequest, DataExportStatusEnum

logger = logging.getLogger(__name__)


# 1 active export per 24h. The endpoint surfaces 429 if the user has a
# pending/running/completed request that's still within this window.
RATE_LIMIT_WINDOW = datetime.timedelta(hours=24)


class ExportRateLimited(Exception):
    """Raised when the user has an active export within the rate-limit window."""

    def __init__(self, retry_after_s: int):
        self.retry_after_s = retry_after_s
        super().__init__(f"Retry after {retry_after_s} seconds.")


async def has_recent_request(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    window: datetime.timedelta = RATE_LIMIT_WINDOW,
) -> Optional[DataExportRequest]:
    cutoff = datetime.datetime.now(datetime.timezone.utc) - window
    result = await db.execute(
        select(DataExportRequest)
        .where(
            DataExportRequest.user_id == user_id,
            DataExportRequest.requested_at >= cutoff,
            DataExportRequest.status.in_(
                [
                    DataExportStatusEnum.PENDING.value,
                    DataExportStatusEnum.RUNNING.value,
                    DataExportStatusEnum.COMPLETED.value,
                ]
            ),
        )
        .order_by(DataExportRequest.requested_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def request_export(db: AsyncSession, user_id: uuid.UUID) -> DataExportRequest:
    recent = await has_recent_request(db, user_id)
    if recent is not None:
        elapsed = datetime.datetime.now(datetime.timezone.utc) - recent.requested_at
        retry_after_s = max(60, int(RATE_LIMIT_WINDOW.total_seconds() - elapsed.total_seconds()))
        raise ExportRateLimited(retry_after_s=retry_after_s)
    req = DataExportRequest(
        user_id=user_id,
        status=DataExportStatusEnum.PENDING.value,
    )
    db.add(req)
    await db.flush()
    return req


async def get_request(
    db: AsyncSession,
    user_id: uuid.UUID,
    request_id: uuid.UUID,
) -> Optional[DataExportRequest]:
    result = await db.execute(
        select(DataExportRequest).where(
            DataExportRequest.id == request_id,
            DataExportRequest.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


def mint_signed_download(req: DataExportRequest, expires_s: int = DEFAULT_GET_EXPIRY_S) -> str:
    if req.bucket is None or req.key is None:
        raise ValueError("Export request has no stored blob")
    return get_presigned_get_url(
        bucket=req.bucket,
        key=req.key,
        expires_s=expires_s,
        response_content_disposition=f'attachment; filename="healthos-export-{req.id}.tar.gz"',
        response_content_type="application/gzip",
    )

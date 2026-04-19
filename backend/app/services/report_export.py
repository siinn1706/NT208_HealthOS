"""B7 P10 — Report PDF export service.

Mirrors `data_export.py` but for PDF report jobs. Signed URLs are minted on
each download click (never persisted) and force `Content-Disposition:
attachment` so the browser saves the file straight to disk.
"""
from __future__ import annotations

import datetime
import logging
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.storage import DEFAULT_GET_EXPIRY_S, get_presigned_get_url
from app.models.core import ReportExportRequest

logger = logging.getLogger(__name__)


async def request_report_export(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    period: str,
    sections: list[str],
    locale: str,
    include_sensitive: bool,
) -> ReportExportRequest:
    req = ReportExportRequest(
        user_id=user_id,
        status="pending",
        period=period,
        sections=sections,
        locale=locale,
        include_sensitive=include_sensitive,
    )
    db.add(req)
    await db.flush()
    return req


async def get_report_request(
    db: AsyncSession,
    user_id: uuid.UUID,
    request_id: uuid.UUID,
) -> Optional[ReportExportRequest]:
    result = await db.execute(
        select(ReportExportRequest).where(
            ReportExportRequest.id == request_id,
            ReportExportRequest.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


def mint_signed_download(req: ReportExportRequest, expires_s: int = DEFAULT_GET_EXPIRY_S) -> str:
    if req.bucket is None or req.key is None:
        raise ValueError("Report export request has no stored blob")
    fname = f"healthos-report-{req.period}-{req.completed_at.date() if req.completed_at else 'pending'}.pdf"
    return get_presigned_get_url(
        bucket=req.bucket,
        key=req.key,
        expires_s=expires_s,
        response_content_disposition=f'attachment; filename="{fname}"',
        response_content_type="application/pdf",
    )

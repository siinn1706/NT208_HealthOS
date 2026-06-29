from __future__ import annotations

import datetime
import logging
import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.adapters.storage import DEFAULT_GET_EXPIRY_S
from app.core.config import settings
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.audit import AuditEventTypeEnum
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.insights import HealthReportResponse, TrendAnalysisBatchResponse, TrendAnalysisResponse
from app.schemas.report_export import (
    ReportExportRequestBody,
    ReportExportRequestDTO,
    ReportExportRequestResponse,
    ReportExportSignedUrlData,
    ReportExportSignedUrlResponse,
    SUPPORTED_SECTIONS,
)
from app.schemas.report_share import ShareReportRequest, ShareReportResponse
from app.services import insights as insight_svc
from app.services import report_export as report_export_svc
from app.services import report_share as report_share_svc
from app.services.audit import audit
from app.services.security_logging import log_resource_access_denied


# B7 review P1-10 — per-user rate limit on PDF export. WeasyPrint is CPU-heavy
# enough that a small token bucket keeps a single user from monopolising the
# Celery worker pool. Tuned conservatively; bump if real workloads need more.
_PDF_RATE_LIMIT_KEY = "rate:reports.export-pdf:{user_id}"
_PDF_RATE_LIMIT_MAX = 5
_PDF_RATE_LIMIT_WINDOW_S = 60 * 60  # 5 PDFs per rolling hour per user


async def _enforce_pdf_rate_limit(redis: Redis, user_id: uuid.UUID) -> None:
    key = _PDF_RATE_LIMIT_KEY.format(user_id=user_id)
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, _PDF_RATE_LIMIT_WINDOW_S)
    if current > _PDF_RATE_LIMIT_MAX:
        ttl = await redis.ttl(key)
        raise ApiException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMITED",
            message=f"You can request at most {_PDF_RATE_LIMIT_MAX} PDF exports per hour.",
            details={"retry_after_s": max(60, int(ttl) if ttl else _PDF_RATE_LIMIT_WINDOW_S)},
        )


# Report sharing sends email to arbitrary external addresses, so it is a spam
# vector — cap it per user the same way as the PDF export.
_SHARE_RATE_LIMIT_KEY = "rate:reports.share:{user_id}"
_SHARE_RATE_LIMIT_MAX = 10
_SHARE_RATE_LIMIT_WINDOW_S = 60 * 60  # 10 shares per rolling hour per user


async def _enforce_share_rate_limit(redis: Redis, user_id: uuid.UUID) -> None:
    key = _SHARE_RATE_LIMIT_KEY.format(user_id=user_id)
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, _SHARE_RATE_LIMIT_WINDOW_S)
    if current > _SHARE_RATE_LIMIT_MAX:
        ttl = await redis.ttl(key)
        raise ApiException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMITED",
            message=f"You can share at most {_SHARE_RATE_LIMIT_MAX} reports per hour.",
            details={"retry_after_s": max(60, int(ttl) if ttl else _SHARE_RATE_LIMIT_WINDOW_S)},
        )

router = APIRouter(prefix="/reports", tags=["Reports"])
_LOGGER = logging.getLogger(__name__)


def _log_trend_endpoint_duration(endpoint: str, started_at: float, metric_count: int) -> None:
    if not settings.debug:
        return
    _LOGGER.debug(
        "reports_trend_endpoint_duration endpoint=%s metric_count=%d duration_ms=%.1f",
        endpoint,
        metric_count,
        (time.perf_counter() - started_at) * 1000.0,
    )


def _parse_trend_metrics_param(raw: str) -> list[str]:
    requested: list[str] = []
    seen: set[str] = set()
    for token in raw.split(","):
        metric = token.strip().lower()
        if (
            not metric
            or metric not in insight_svc.TREND_ANALYSIS_METRICS
            or metric in seen
        ):
            continue
        seen.add(metric)
        requested.append(metric)

    if not requested:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message="No supported trend metrics requested.",
        )

    return requested


@router.get(
    "",
    response_model=HealthReportResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get health report",
)
async def get_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(default="7d", pattern="^(7d|30d|90d)$"),
) -> HealthReportResponse:
    data = await insight_svc.get_health_report(db, current_user, period)
    return HealthReportResponse(data=data)


@router.post(
    "",
    response_model=HealthReportResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Generate health report",
)
async def generate_report(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(default="7d", pattern="^(7d|30d|90d)$"),
) -> HealthReportResponse:
    data = await insight_svc.get_health_report(db, current_user, period)
    return HealthReportResponse(data=data)


@router.post(
    "/share",
    response_model=ShareReportResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Share a health report with recipients via email / in-app.",
)
async def share_report_endpoint(
    body: ShareReportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> ShareReportResponse:
    await _enforce_share_rate_limit(redis, current_user.id)
    results = await report_share_svc.share_report(db, current_user, body)
    await db.commit()
    return ShareReportResponse(data=results)


@router.get(
    "/trends",
    response_model=TrendAnalysisResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get report trend analysis",
)
async def get_report_trends(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    metric: str = Query(default="heart_rate"),
    period: str = Query(default="7d", pattern="^(7d|30d|90d)$"),
) -> TrendAnalysisResponse:
    started_at = time.perf_counter()
    data = await insight_svc.get_trend_analysis(db, current_user, metric, period)
    _log_trend_endpoint_duration("single", started_at, 1)
    return TrendAnalysisResponse(data=data)


@router.get(
    "/trends/batch",
    response_model=TrendAnalysisBatchResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Get report trend analysis for multiple metrics",
)
async def get_report_trends_batch(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    metrics: str = Query(...),
    period: str = Query(default="7d", pattern="^(7d|30d|90d)$"),
) -> TrendAnalysisBatchResponse:
    parsed_metrics = _parse_trend_metrics_param(metrics)
    started_at = time.perf_counter()
    data = await insight_svc.get_trend_analysis_batch(db, current_user, parsed_metrics, period)
    _log_trend_endpoint_duration("batch", started_at, len(parsed_metrics))
    return TrendAnalysisBatchResponse(data=data)


# ─── B7 P10 — PDF report export ──────────────────────────────────────────


@router.post(
    "/export-pdf",
    response_model=ReportExportRequestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
    summary="Request a PDF render of the current health report (async).",
)
async def request_report_pdf(
    body: ReportExportRequestBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> ReportExportRequestResponse:
    invalid = [s for s in body.sections if s not in SUPPORTED_SECTIONS]
    if invalid:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message=f"Unknown sections: {', '.join(invalid)}",
        )

    # B7 review P1-10 — gate request rate per user before queueing the work.
    await _enforce_pdf_rate_limit(redis, current_user.id)

    # B7 review P1-9 — the worker rebuilds the snapshot from `(user_id, request_id)`.
    # We no longer ship the snapshot through the broker.
    req = await report_export_svc.request_report_export(
        db=db,
        user_id=current_user.id,
        period=body.period,
        sections=body.sections,
        locale=body.locale,
        include_sensitive=body.include_sensitive,
    )
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.REPORT_PDF_REQUESTED,
        user_id=current_user.id,
        request=request,
        details={
            "request_id": str(req.id),
            "period": body.period,
            "sections": body.sections,
            "include_sensitive": body.include_sensitive,
        },
    )
    await db.commit()

    from app.tasks.report_pdf import render_health_report_pdf

    render_health_report_pdf.delay(str(current_user.id), str(req.id))
    return ReportExportRequestResponse(data=ReportExportRequestDTO.model_validate(req))


@router.get(
    "/export-pdf/{request_id}",
    response_model=ReportExportRequestResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Poll the PDF render job status.",
)
async def get_report_pdf_status(
    request_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReportExportRequestResponse:
    req = await report_export_svc.get_report_request(db, current_user.id, request_id)
    if req is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="reports",
            resource_id=str(request_id),
            http_method="GET",
            route="/reports/export-pdf/{request_id}",
        )
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="PDF export request not found.",
        )
    return ReportExportRequestResponse(data=ReportExportRequestDTO.model_validate(req))


@router.get(
    "/export-pdf/{request_id}/download",
    response_model=ReportExportSignedUrlResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        410: {"model": ErrorResponse},
    },
    summary="Mint a fresh 5-minute signed URL for a completed PDF export.",
)
async def get_report_pdf_download(
    request_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReportExportSignedUrlResponse:
    req = await report_export_svc.get_report_request(db, current_user.id, request_id)
    if req is None:
        await log_resource_access_denied(
            user_id=current_user.id,
            module="reports",
            resource_id=str(request_id),
            http_method="GET",
            route="/reports/export-pdf/{request_id}/download",
        )
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="PDF export request not found.",
        )
    if req.status != "completed":
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="EXPORT_NOT_READY",
            message="PDF is not complete yet.",
        )
    now = datetime.datetime.now(datetime.timezone.utc)
    if req.expires_at is not None and req.expires_at <= now:
        raise ApiException(
            status_code=status.HTTP_410_GONE,
            code="EXPORT_EXPIRED",
            message="Download link has expired.",
        )
    url = report_export_svc.mint_signed_download(req)
    await audit(
        db=db,
        event_type=AuditEventTypeEnum.REPORT_PDF_DOWNLOADED,
        user_id=current_user.id,
        request=request,
        details={"request_id": str(req.id)},
    )
    await db.commit()
    return ReportExportSignedUrlResponse(
        data=ReportExportSignedUrlData(
            url=url,
            expires_in_s=DEFAULT_GET_EXPIRY_S,
            bytes=req.bytes or 0,
            expires_at=req.expires_at or now,
        )
    )


"""Health metrics endpoints."""
from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import MetricTypeEnum, User, WearableSourceEnum
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.health_metrics import (
    AggregationResponse,
    ComparisonResponse,
    HealthMetricCreate,
    HealthMetricListResponse,
    HealthMetricResponse,
    HealthMetricUpdate,
    MetricAggregatePoint,
    PeriodComparisonResponse,
)
from app.services import health_metrics as health_metric_svc

router = APIRouter(prefix="/health-metrics", tags=["Health Metrics"])


@router.get(
    "",
    response_model=HealthMetricListResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="List health metrics",
)
async def list_health_metrics(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    metric_type: MetricTypeEnum | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    source: WearableSourceEnum | None = None,
    range: Annotated[str | None, Query(pattern="^(7d|30d|90d)$")] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
) -> HealthMetricListResponse:

    metrics, total = await health_metric_svc.list_health_metrics(
        db=db,
        user_id=current_user.id,
        metric_type=metric_type,
        source=source,
        date_from=date_from,
        date_to=date_to,
        range_value=range,
        page=page,
        per_page=per_page,
    )
    return HealthMetricListResponse(
        data=[HealthMetricResponse.model_validate(item) for item in metrics],
        meta=PaginationMeta(page=page, per_page=per_page, total=total),
    )


@router.get(
    "/aggregated",
    response_model=AggregationResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get aggregated health metrics by period",
)
async def get_aggregated_metrics(
    metric_type: MetricTypeEnum,
    period: Literal["daily", "weekly", "monthly"] = "daily",
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await health_metric_svc.aggregate_by_period(
        db, current_user.id, metric_type, period, date_from, date_to
    )
    return AggregationResponse(data=[MetricAggregatePoint(**row) for row in data])


@router.get(
    "/compare",
    response_model=ComparisonResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Compare multiple metrics over time",
)
async def compare_metrics_endpoint(
    metrics: Annotated[str, Query(description="Comma-separated metric types, e.g. heart_rate,steps")],
    period: Literal["7d", "30d", "90d"] = "30d",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map[period]
    date_to = datetime.datetime.now(datetime.timezone.utc).date()
    date_from = date_to - datetime.timedelta(days=days - 1)
    metric_types = [MetricTypeEnum(m.strip()) for m in metrics.split(",")]
    data = await health_metric_svc.compare_metrics(
        db, current_user.id, metric_types, date_from, date_to
    )
    return ComparisonResponse(data=data)


@router.get(
    "/compare-periods",
    response_model=PeriodComparisonResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Compare current period vs previous period stats",
)
async def compare_periods_endpoint(
    metric: MetricTypeEnum,
    period: Literal["7d", "30d", "90d"] = "30d",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map[period]
    data = await health_metric_svc.compare_periods(db, current_user.id, metric, days)
    return PeriodComparisonResponse(data=data)


@router.post(
    "",
    response_model=HealthMetricResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="Create a new health metric",
)
async def create_metric(
    data: HealthMetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    metric = await health_metric_svc.create_health_metric(db, current_user.id, data)
    return HealthMetricResponse.model_validate(metric)


@router.patch(
    "/{metric_id}",
    response_model=HealthMetricResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Update an existing health metric",
)
async def update_metric(
    metric_id: uuid.UUID,
    data: HealthMetricUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    metric = await health_metric_svc.update_health_metric(db, metric_id, current_user.id, data)
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Metric not found"},
        )
    return HealthMetricResponse.model_validate(metric)

"""Health metrics endpoints."""
from __future__ import annotations

import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import MetricTypeEnum, User, WearableSourceEnum
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.health_metrics import HealthMetricListResponse, HealthMetricResponse
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
    page: int = 1,
    per_page: int = 20,
) -> HealthMetricListResponse:
    if page < 1 or per_page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "page and per_page must be >= 1",
            },
        )

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

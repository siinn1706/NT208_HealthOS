from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.insights import HealthReportResponse, TrendAnalysisResponse
from app.services import insights as insight_svc

router = APIRouter(prefix="/reports", tags=["Reports"])


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
    data = await insight_svc.get_trend_analysis(db, current_user, metric, period)
    return TrendAnalysisResponse(data=data)


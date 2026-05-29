from __future__ import annotations

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    ExerciseSuggestionsResponse,
    ExtendedVitalsTimeseriesResponse,
)
from app.services import dashboard as dashboard_svc

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
_LOGGER = logging.getLogger(__name__)


def _log_endpoint_duration(endpoint: str, started_at: float) -> None:
    if not settings.debug:
        return
    _LOGGER.debug(
        "dashboard_endpoint_duration endpoint=%s duration_ms=%.1f",
        endpoint,
        (time.perf_counter() - started_at) * 1000.0,
    )


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get dashboard summary",
)
async def get_dashboard_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardSummaryResponse:
    started_at = time.perf_counter()
    data = await dashboard_svc.get_dashboard_summary(db, current_user)
    _log_endpoint_duration("summary", started_at)
    return DashboardSummaryResponse(data=data)

@router.get(
    "/vitals-extended",
    response_model=ExtendedVitalsTimeseriesResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get extended vitals timeseries (HR, BP, steps, sleep, weight)",
)
async def get_vitals_extended(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = 30,
) -> ExtendedVitalsTimeseriesResponse:
    started_at = time.perf_counter()
    data = await dashboard_svc.get_extended_vitals_timeseries(db=db, user_id=current_user.id, days=days)
    _log_endpoint_duration("vitals-extended", started_at)
    return ExtendedVitalsTimeseriesResponse(data=data)


@router.get(
    "/exercise-suggestions",
    response_model=ExerciseSuggestionsResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get exercise suggestions based on health metrics",
)
async def get_exercise_suggestions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExerciseSuggestionsResponse:
    started_at = time.perf_counter()
    data = await dashboard_svc.get_exercise_suggestions(
        db=db,
        user_id=current_user.id,
        user=current_user,
        locale="vi",
    )
    _log_endpoint_duration("exercise-suggestions", started_at)
    return ExerciseSuggestionsResponse(data=data)

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
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
    data = await dashboard_svc.get_dashboard_summary(db, current_user)
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
    data = await dashboard_svc.get_extended_vitals_timeseries(db=db, user_id=current_user.id, days=days)
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
    data = await dashboard_svc.get_exercise_suggestions(
        db=db,
        user_id=current_user.id,
        user=current_user,
        locale="vi",
    )
    return ExerciseSuggestionsResponse(data=data)

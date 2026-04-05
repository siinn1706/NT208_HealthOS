from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.insights import RiskPredictionResponse
from app.services import insights as insight_svc

router = APIRouter(prefix="/health", tags=["Health Insights"])


@router.get(
    "/risk-predictions",
    response_model=RiskPredictionResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get health risk predictions",
)
async def get_risk_predictions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RiskPredictionResponse:
    data = await insight_svc.get_risk_summary(db, current_user)
    return RiskPredictionResponse(data=data)


@router.post(
    "/risk-predictions",
    response_model=RiskPredictionResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Refresh health risk predictions",
)
async def refresh_risk_predictions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RiskPredictionResponse:
    data = await insight_svc.get_risk_summary(db, current_user)
    return RiskPredictionResponse(data=data)


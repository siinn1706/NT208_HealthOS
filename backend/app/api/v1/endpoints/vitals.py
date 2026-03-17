from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.dashboard import VitalsTimeseriesResponse
from app.services import dashboard as dashboard_svc

router = APIRouter(prefix="/vitals", tags=["Vitals"])


@router.get(
    "/timeseries",
    response_model=VitalsTimeseriesResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get vitals timeseries",
)
async def get_vitals_timeseries(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=7, ge=1, le=90),
) -> VitalsTimeseriesResponse:
    data = await dashboard_svc.get_vitals_timeseries(db, current_user.id, days=days)
    return VitalsTimeseriesResponse(data=data)


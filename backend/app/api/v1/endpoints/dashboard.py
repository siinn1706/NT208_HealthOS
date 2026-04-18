from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.dashboard import DashboardSummaryResponse
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


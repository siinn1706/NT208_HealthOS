"""Goals progress endpoint."""
from __future__ import annotations

import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import MetricTypeEnum, User
from app.schemas.health_metrics import GoalProgressPoint, GoalProgressResponse
from app.services import health_metrics as health_metric_svc

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get(
    "/progress",
    response_model=GoalProgressResponse,
    summary="Get goal progress for a metric over a period",
)
async def get_goal_progress(
    metric: MetricTypeEnum,
    target: Annotated[float, Query(gt=0, description="Target value to compare against")],
    period: Literal["7d", "30d", "90d"] = "30d",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map[period]
    now = datetime.datetime.now(datetime.timezone.utc).date()
    date_from = now - datetime.timedelta(days=days - 1)
    data = await health_metric_svc.calculate_goal_progress(
        db, current_user.id, metric, target, date_from, now
    )
    return GoalProgressResponse(data=[GoalProgressPoint(**row) for row in data])

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.models.health_goal import HealthGoal
from app.schemas.common import DataResponse
from app.schemas.health_goal import (
    HealthGoalCreate,
    HealthGoalDataResponse,
    HealthGoalResponse,
    HealthGoalUpdate,
)
from app.services import health_goal as health_goal_svc

router = APIRouter(prefix="/health-goals", tags=["health-goals"])


def _to_response(goal: "HealthGoal") -> HealthGoalResponse:
    return HealthGoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        target_weight_kg=goal.target_weight_kg,
        current_height_cm=goal.current_height_cm,
        deadline=goal.deadline,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.get(
    "",
    response_model=HealthGoalDataResponse,
    responses={401: {"model": DataResponse}},
    summary="Get current user's health goal",
)
async def get_health_goal(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HealthGoalDataResponse:
    goal = await health_goal_svc.HealthGoalService().get_by_user(db, current_user.id)
    if goal is None:
        return HealthGoalDataResponse(data=None)
    return HealthGoalDataResponse(data=_to_response(goal))


@router.post(
    "",
    response_model=HealthGoalDataResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": DataResponse}, 400: {"model": DataResponse}},
    summary="Create or upsert health goal",
)
async def create_health_goal(
    body: HealthGoalCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HealthGoalDataResponse:
    goal = await health_goal_svc.HealthGoalService().create(db, current_user.id, body)
    await db.commit()
    return HealthGoalDataResponse(data=_to_response(goal))


@router.patch(
    "/{goal_id}",
    response_model=HealthGoalDataResponse,
    responses={
        401: {"model": DataResponse},
        403: {"model": DataResponse},
        404: {"model": DataResponse},
    },
    summary="Update health goal",
)
async def update_health_goal(
    goal_id: uuid.UUID,
    body: HealthGoalUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HealthGoalDataResponse:
    service = health_goal_svc.HealthGoalService()
    goal = await service.get_by_user(db, current_user.id)
    if goal is None or goal.id != goal_id:
        from app.exceptions import ApiException

        raise ApiException(
            status_code=404,
            code="NOT_FOUND",
            message="Health goal not found",
        )
    updated = await service.update(db, goal, body, current_user.id)
    await db.commit()
    return HealthGoalDataResponse(data=_to_response(updated))


@router.delete(
    "/{goal_id}",
    response_model=DataResponse,
    responses={
        401: {"model": DataResponse},
        403: {"model": DataResponse},
        404: {"model": DataResponse},
    },
    summary="Delete health goal",
)
async def delete_health_goal(
    goal_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataResponse:
    service = health_goal_svc.HealthGoalService()
    goal = await service.get_by_user(db, current_user.id)
    if goal is None or goal.id != goal_id:
        from app.exceptions import ApiException

        raise ApiException(
            status_code=404,
            code="NOT_FOUND",
            message="Health goal not found",
        )
    await service.delete(db, goal, current_user.id)
    await db.commit()
    return DataResponse(data={"deleted": True})

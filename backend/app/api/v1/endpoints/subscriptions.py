from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.subscriptions import (
    SubscriptionPlanDTO,
    SubscriptionPlanListResponse,
    UserSubscriptionResponse,
)
from app.services import subscriptions as subscription_service

router = APIRouter(tags=["Subscriptions"])


@router.get(
    "/subscription-plans",
    response_model=SubscriptionPlanListResponse,
    responses={500: {"model": ErrorResponse}},
    summary="List active subscription plans for pricing",
)
async def list_subscription_plans(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionPlanListResponse:
    plans = await subscription_service.list_active_subscription_plans(db)
    return SubscriptionPlanListResponse(data=[SubscriptionPlanDTO.model_validate(plan) for plan in plans])


@router.get(
    "/subscription/me",
    response_model=UserSubscriptionResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get the current user's subscription summary",
)
async def get_my_subscription(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserSubscriptionResponse:
    summary = await subscription_service.get_user_subscription_summary(db, current_user.id)
    return UserSubscriptionResponse(data=summary)

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.exceptions import ApiException
from app.models.health_goal import HealthGoal
from app.schemas.health_goal import HealthGoalCreate, HealthGoalUpdate


class HealthGoalService:
    async def get_by_user(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> HealthGoal | None:
        try:
            result = await db.execute(
                select(HealthGoal).where(HealthGoal.user_id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception:
            raise ApiException(
                status_code=500,
                code="INTERNAL_ERROR",
                message="Failed to retrieve health goal",
            )

    async def create(
        self, db: AsyncSession, user_id: uuid.UUID, data: HealthGoalCreate
    ) -> HealthGoal:
        existing = await self.get_by_user(db, user_id)
        if existing:
            return await self.update(db, existing, data, user_id)

        try:
            goal = HealthGoal(
                user_id=user_id,
                target_weight_kg=data.target_weight_kg,
                deadline=data.deadline,
            )
            db.add(goal)
            await db.flush()
            await db.refresh(goal)
            return goal
        except IntegrityError:
            await db.rollback()
            raise ApiException(
                status_code=409,
                code="CONFLICT",
                message="Health goal already exists for this user",
            )
        except Exception:
            await db.rollback()
            raise ApiException(
                status_code=500,
                code="INTERNAL_ERROR",
                message="Failed to create health goal",
            )

    async def update(
        self,
        db: AsyncSession,
        goal: HealthGoal,
        data: HealthGoalUpdate,
        current_user_id: uuid.UUID,
    ) -> HealthGoal | None:
        if goal.user_id != current_user_id:
            return None

        try:
            if data.target_weight_kg is not None:
                goal.target_weight_kg = data.target_weight_kg
            if data.deadline is not None:
                goal.deadline = data.deadline

            await db.flush()
            await db.refresh(goal)
            return goal
        except IntegrityError:
            await db.rollback()
            raise ApiException(
                status_code=409,
                code="CONFLICT",
                message="Failed to update health goal due to constraint conflict",
            )
        except Exception:
            await db.rollback()
            raise ApiException(
                status_code=500,
                code="INTERNAL_ERROR",
                message="Failed to update health goal",
            )

    async def delete(
        self, db: AsyncSession, goal: HealthGoal, current_user_id: uuid.UUID
    ) -> None:
        if goal.user_id != current_user_id:
            return None

        try:
            await db.delete(goal)
            await db.flush()
        except Exception:
            await db.rollback()
            raise ApiException(
                status_code=500,
                code="INTERNAL_ERROR",
                message="Failed to delete health goal",
            )

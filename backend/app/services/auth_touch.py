from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from redis.asyncio import Redis
from sqlalchemy import or_, update

from app.adapters.database import AsyncSessionLocal
from app.models.core import User

logger = logging.getLogger(__name__)

TOUCH_THROTTLE_SECONDS = 60
LAST_SEEN_TOUCH_KEY_PREFIX = "auth:last_seen_touch:"


async def schedule_user_last_seen_touch(
    user_id: uuid.UUID,
    redis: Redis,
    background_tasks: BackgroundTasks,
) -> None:
    try:
        should_schedule = await redis.set(
            f"{LAST_SEEN_TOUCH_KEY_PREFIX}{user_id}",
            "1",
            ex=TOUCH_THROTTLE_SECONDS,
            nx=True,
        )
    except Exception:
        logger.debug(
            "Failed to check user last_seen_at touch throttle",
            extra={"user_id": str(user_id)},
            exc_info=True,
        )
        return

    if not should_schedule:
        return

    try:
        background_tasks.add_task(touch_user_last_seen, user_id)
    except Exception:
        logger.warning(
            "Failed to schedule user last_seen_at touch",
            extra={"user_id": str(user_id)},
            exc_info=True,
        )


async def touch_user_last_seen(user_id: uuid.UUID, *, now: datetime | None = None) -> None:
    effective_now = now or datetime.now(timezone.utc)
    cutoff = effective_now - timedelta(seconds=TOUCH_THROTTLE_SECONDS)
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .where(or_(User.last_seen_at.is_(None), User.last_seen_at < cutoff))
                .values(last_seen_at=effective_now)
            )
            await db.commit()
    except Exception:
        logger.warning("Failed to update user last_seen_at", extra={"user_id": str(user_id)}, exc_info=True)

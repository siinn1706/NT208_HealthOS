from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, update

from app.adapters.database import AsyncSessionLocal
from app.models.core import User

logger = logging.getLogger(__name__)

TOUCH_THROTTLE_SECONDS = 60


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

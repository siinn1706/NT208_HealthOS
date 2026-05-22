from __future__ import annotations

import uuid
from typing import TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


async def get_owned(
    db: AsyncSession,
    model: type[T],
    *,
    id_: uuid.UUID,
    user_id: uuid.UUID,
) -> T | None:
    """Direct-column ownership lookup for models with `.id` PK and `.user_id` FK.

    Does NOT support:
    - JOIN-based ownership (e.g., ConversationMember join) — use inline query.
    - User-keyed 1:1 rows without an (id, user_id) pair — use model-specific query.
    - Celery task args that cross session boundaries — verify in-task.
    """
    stmt = select(model).where(model.id == id_, model.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()

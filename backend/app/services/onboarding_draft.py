"""Service functions for onboarding draft persistence."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import delete, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core import OnboardingDraft

logger = logging.getLogger(__name__)

_DRAFT_TTL_DAYS = 30
_MAX_DRAFT_BYTES = 64 * 1024


async def get_draft(db: AsyncSession, user_id: uuid.UUID) -> Optional[OnboardingDraft]:
    stmt = select(OnboardingDraft).where(OnboardingDraft.user_id == user_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def upsert_draft(db: AsyncSession, user_id: uuid.UUID, data: dict[str, Any]) -> OnboardingDraft:
    raw_size = len(json.dumps(data).encode("utf-8"))
    if raw_size > _MAX_DRAFT_BYTES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Draft payload exceeds 64 KiB limit."},
        )

    logger.info("onboarding_draft upsert user_id=%s size_bytes=%d", user_id, raw_size)

    expires_at = datetime.now(timezone.utc) + timedelta(days=_DRAFT_TTL_DAYS)

    stmt = (
        pg_insert(OnboardingDraft)
        .values(
            id=uuid.uuid4(),
            user_id=user_id,
            data=data,
            expires_at=expires_at,
        )
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={"data": data, "updated_at": text("now()"), "expires_at": expires_at},
        )
        .returning(OnboardingDraft)
    )
    row = (await db.execute(stmt)).scalar_one()
    await db.flush()
    return row


async def delete_draft(db: AsyncSession, user_id: uuid.UUID) -> None:
    stmt = delete(OnboardingDraft).where(OnboardingDraft.user_id == user_id)
    await db.execute(stmt)
    await db.flush()

"""Lookup + caching for the singleton AI bot system user.

The AI bot is created via Alembic migration ``014_add_ai_bot_user`` with
``is_system = True``. Every AI message persisted in the chat tables uses
the bot's UUID as ``sender_id``. The orchestrator also auto-promotes the
bot to a ``ConversationMember`` of every AI conversation it answers in,
so the FE participants list naturally exposes the bot.

The lookup result is cached in-process for the lifetime of the worker —
the bot row never moves, so a single SELECT per process is enough.
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.core import (
    Conversation,
    ConversationMember,
    ConversationTypeEnum,
    User,
)


_AI_BOT_USER_ID_CACHE: Optional[uuid.UUID] = None
_CACHE_LOCK = asyncio.Lock()


async def get_ai_bot_user_id(db: AsyncSession) -> uuid.UUID:
    """Return the AI bot's user UUID, fetching once and caching it.

    Raises ``RuntimeError`` if the bot row is missing — callers should
    ensure the migration ran. We don't auto-create here: schema seeds
    belong to migrations, not request paths.
    """
    global _AI_BOT_USER_ID_CACHE
    if _AI_BOT_USER_ID_CACHE is not None:
        return _AI_BOT_USER_ID_CACHE

    async with _CACHE_LOCK:
        if _AI_BOT_USER_ID_CACHE is not None:
            return _AI_BOT_USER_ID_CACHE
        result = await db.execute(
            select(User.id).where(User.email == settings.ai_bot_email)
        )
        bot_id = result.scalar_one_or_none()
        if bot_id is None:
            raise RuntimeError(
                f"AI bot user (email={settings.ai_bot_email}) is missing. "
                "Did migration 014_add_ai_bot_user run?"
            )
        _AI_BOT_USER_ID_CACHE = bot_id
    return _AI_BOT_USER_ID_CACHE


async def ensure_ai_bot_member(
    db: AsyncSession,
    conversation_id: uuid.UUID,
) -> uuid.UUID:
    """Make sure the bot is a member of the given AI conversation.

    Idempotent: if the bot is already a member, this is a no-op. Returns
    the bot's user id either way so callers can use it for the new
    message's ``sender_id``.
    """
    bot_id = await get_ai_bot_user_id(db)

    existing = await db.execute(
        select(ConversationMember.id).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == bot_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(
            ConversationMember(
                conversation_id=conversation_id,
                user_id=bot_id,
                role="assistant",
                is_accepted=True,
            )
        )
        await db.flush()
    return bot_id


async def is_ai_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
) -> bool:
    """Return True if the conversation row has ``type = AI``."""
    result = await db.execute(
        select(Conversation.type).where(Conversation.id == conversation_id)
    )
    conv_type = result.scalar_one_or_none()
    return conv_type == ConversationTypeEnum.AI


def _reset_cache_for_tests() -> None:
    """Test-only helper: clear the cached bot id so each test re-reads."""
    global _AI_BOT_USER_ID_CACHE
    _AI_BOT_USER_ID_CACHE = None

"""Tests for the AI bot user lookup + caching service."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import ai_bot


@pytest.fixture(autouse=True)
def _reset_cache():
    ai_bot._reset_cache_for_tests()
    yield
    ai_bot._reset_cache_for_tests()


@pytest.mark.asyncio
async def test_get_ai_bot_user_id_returns_cached_value():
    bot_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = bot_id
    mock_db.execute = AsyncMock(return_value=mock_result)

    first = await ai_bot.get_ai_bot_user_id(mock_db)
    second = await ai_bot.get_ai_bot_user_id(mock_db)

    assert first == bot_id
    assert second == bot_id
    # Cache should prevent a second SELECT.
    assert mock_db.execute.await_count == 1


@pytest.mark.asyncio
async def test_get_ai_bot_user_id_raises_when_missing():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(RuntimeError, match="AI bot user"):
        await ai_bot.get_ai_bot_user_id(mock_db)

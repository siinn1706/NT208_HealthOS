from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.adapters import redis_client
from app.schemas.dashboard import ExerciseSuggestionDTO
from app.services import ai_chat_context, dashboard


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.get_calls: list[str] = []
        self.setex_calls: list[tuple[str, int, str]] = []

    async def get(self, key: str) -> str | None:
        self.get_calls.append(key)
        return self.store.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.setex_calls.append((key, ttl, value))
        self.store[key] = value


def _suggestion(
    item_id: str,
    *,
    source: str,
    priority: int = 1,
) -> ExerciseSuggestionDTO:
    return ExerciseSuggestionDTO(
        id=item_id,
        type="tip",
        icon="Dumbbell",
        title=f"{item_id}-title",
        message=f"{item_id}-message",
        priority=priority,
        duration_minutes=20,
        intensity="low",
        category="cardio",
        source=source,
    )


def _patch_redis(monkeypatch: pytest.MonkeyPatch, redis: _FakeRedis) -> None:
    async def fake_get_redis() -> _FakeRedis:
        return redis

    monkeypatch.setattr(redis_client, "get_redis", fake_get_redis)


def _patch_context(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_build_user_context(*_args: Any, **_kwargs: Any) -> dict[str, str]:
        return {"risk_level": "routine"}

    monkeypatch.setattr(ai_chat_context, "build_user_context", fake_build_user_context)


def _cache_payload(items: list[ExerciseSuggestionDTO]) -> str:
    return json.dumps([item.model_dump() for item in items], default=str)


@pytest.mark.asyncio
async def test_exercise_suggestions_cache_hit_uses_locale_key_and_skips_ai(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    cache_key = f"ai:exercise:{user_id}:en"
    redis.store[cache_key] = _cache_payload([_suggestion("cached", source="ai")])
    _patch_redis(monkeypatch, redis)

    async def fail_ai(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise AssertionError("AI worker should not run on cache hit")

    async def fail_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise AssertionError("rule fallback should not run on cache hit")

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", fail_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fail_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="en",
    )

    assert [item.id for item in result] == ["cached"]
    assert result[0].source == "ai"
    assert redis.get_calls == [cache_key]
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_exercise_suggestions_ai_success_caches_non_empty_locale_result(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)

    async def fake_ai(user_context: dict, locale: str) -> list[ExerciseSuggestionDTO]:
        assert user_context == {"risk_level": "routine"}
        assert locale == "en"
        return [_suggestion("ai-success", source="ai")]

    async def fail_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise AssertionError("rule fallback should not run on AI success")

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", fake_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fail_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="en",
    )

    cache_key, ttl, payload = redis.setex_calls[0]
    cached = json.loads(payload)
    assert [item.id for item in result] == ["ai-success"]
    assert cache_key == f"ai:exercise:{user_id}:en"
    assert ttl == dashboard._EXERCISE_CACHE_TTL
    assert cached[0]["source"] == "ai"


@pytest.mark.asyncio
async def test_exercise_suggestions_slow_ai_times_out_and_returns_rule_fallback(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)
    monkeypatch.setattr(dashboard, "_EXERCISE_AI_DASHBOARD_TIMEOUT_SECONDS", 0.01)

    async def slow_ai(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        await asyncio.sleep(0.05)
        return [_suggestion("too-late", source="ai")]

    async def fake_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        return [_suggestion("rule-timeout", source="rule")]

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", slow_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fake_rule)

    started = time.perf_counter()
    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="vi",
    )

    assert time.perf_counter() - started < 0.2
    assert [item.id for item in result] == ["rule-timeout"]
    assert result[0].source == "rule"
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_exercise_suggestions_empty_ai_output_falls_back_without_cache(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)

    async def empty_ai(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        return []

    async def fake_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        return [_suggestion("rule-empty", source="rule")]

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", empty_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fake_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="vi",
    )

    assert [item.id for item in result] == ["rule-empty"]
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_exercise_suggestions_ai_error_falls_back_without_cache(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)

    async def fail_ai(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise RuntimeError("worker unavailable")

    async def fake_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        return [_suggestion("rule-error", source="rule")]

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", fail_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fake_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="vi",
    )

    assert [item.id for item in result] == ["rule-error"]
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_exercise_suggestions_parse_skip_falls_back_without_cache(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)

    async def malformed_ai(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise ValueError("AI returned malformed exercise suggestions")

    async def fake_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        return [_suggestion("rule-parse-skip", source="rule")]

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", malformed_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fake_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale="vi",
    )

    assert [item.id for item in result] == ["rule-parse-skip"]
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_exercise_suggestions_blank_locale_uses_vietnamese_cache_key(monkeypatch):
    redis = _FakeRedis()
    user_id = uuid.uuid4()
    _patch_redis(monkeypatch, redis)
    _patch_context(monkeypatch)

    async def fake_ai(_user_context: dict, locale: str) -> list[ExerciseSuggestionDTO]:
        assert locale == "vi"
        return [_suggestion("ai-default-locale", source="ai")]

    async def fail_rule(*_args: Any, **_kwargs: Any) -> list[ExerciseSuggestionDTO]:
        raise AssertionError("rule fallback should not run on AI success")

    monkeypatch.setattr(dashboard, "_call_ai_worker_exercise", fake_ai)
    monkeypatch.setattr(dashboard, "_rule_based_exercise_suggestions", fail_rule)

    result = await dashboard.get_exercise_suggestions(
        db=AsyncMock(),
        user_id=user_id,
        user=object(),
        locale=" ",
    )

    assert [item.id for item in result] == ["ai-default-locale"]
    assert redis.get_calls == [f"ai:exercise:{user_id}:vi"]
    assert redis.setex_calls[0][0] == f"ai:exercise:{user_id}:vi"

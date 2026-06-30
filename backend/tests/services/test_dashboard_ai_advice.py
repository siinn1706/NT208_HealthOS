from __future__ import annotations

import json
import uuid
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.schemas.dashboard import DashboardAiAdviceDTO
from app.services import dashboard_ai_advice as advice


class _FakeRedis:
    def __init__(self, *, throttle_count: int = 0) -> None:
        self.store: dict[str, str] = {}
        self.get_calls: list[str] = []
        self.setex_calls: list[tuple[str, int, str]] = []
        self.incr_calls: list[str] = []
        self.expire_calls: list[tuple[str, int]] = []
        self.throttle_count = throttle_count

    async def get(self, key: str) -> str | None:
        self.get_calls.append(key)
        return self.store.get(key)

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.setex_calls.append((key, ttl, value))
        self.store[key] = value

    async def incr(self, key: str) -> int:
        self.incr_calls.append(key)
        self.throttle_count += 1
        return self.throttle_count

    async def expire(self, key: str, ttl: int) -> None:
        self.expire_calls.append((key, ttl))


def _user() -> Any:
    return type("User", (), {"id": uuid.uuid4()})()


def _context(*, steps: int = 1200, calories: int = 2600) -> dict[str, Any]:
    return {
        "profile": {"age_years": 28, "bmi": 23.2},
        "health_goals": None,
        "recent_vitals_7d": {"steps_avg_per_day": steps, "samples_count": 7},
        "recent_meals_3d": {"calories_total_3d": calories * 3, "meals_logged_3d": 3},
        "active_medicine_reminders": 0,
        "risk_summary": [],
        "latest": {
            "steps": steps,
            "sleep_minutes": 420,
            "heart_rate_bpm": 72,
            "systolic_mmhg": 118,
            "diastolic_mmhg": 76,
        },
        "today_meals": {"meals_logged": 3, "calories": calories, "protein_g": 80, "carbs_g": 260, "fat_g": 90},
    }


def _patch_context(monkeypatch: pytest.MonkeyPatch, context: dict[str, Any]) -> None:
    async def fake_context(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        return context

    async def fake_rag(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        return {
            "sources": [
                {
                    "title": "WHO physical activity",
                    "organization": "WHO",
                    "url": "https://example.test/who",
                    "excerpt": "Move more.",
                }
            ],
            "limited": False,
        }

    monkeypatch.setattr(advice, "_build_advice_context", fake_context)
    monkeypatch.setattr(advice, "_retrieve_rag", fake_rag)


def _patch_redis(monkeypatch: pytest.MonkeyPatch, redis: _FakeRedis) -> None:
    async def fake_get_redis() -> _FakeRedis:
        return redis

    monkeypatch.setattr(advice.redis_client, "get_redis", fake_get_redis)


def _cached_advice(context_hash: str) -> DashboardAiAdviceDTO:
    return advice._rule_advice(
        context_hash=context_hash,
        signal="high_calories_low_steps",
        locale="en",
        source="ai",
        evidence=[],
    )


@pytest.mark.asyncio
async def test_dashboard_ai_advice_cache_hit_uses_locale_context_key_and_skips_ai(monkeypatch):
    redis = _FakeRedis()
    user = _user()
    context = _context()
    context_hash = advice._context_hash(context)
    cache_key = advice._cache_key(user.id, "en", context_hash)
    redis.store[cache_key] = json.dumps(_cached_advice(context_hash).model_dump(), default=str)
    _patch_context(monkeypatch, context)
    _patch_redis(monkeypatch, redis)

    async def fail_ai(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("AI worker should not run on cache hit")

    monkeypatch.setattr(advice, "_call_ai_worker_health_advice", fail_ai)

    result = await advice.get_dashboard_ai_advice(db=AsyncMock(), user=user, locale="en", surface="mobile")

    assert result.source == "cache"
    assert redis.get_calls == [cache_key]
    assert redis.incr_calls == []


@pytest.mark.asyncio
async def test_dashboard_ai_advice_ai_success_caches_by_locale_and_latest(monkeypatch):
    redis = _FakeRedis()
    user = _user()
    context = _context()
    _patch_context(monkeypatch, context)
    _patch_redis(monkeypatch, redis)

    async def fake_ai(**kwargs: Any) -> dict[str, Any]:
        assert kwargs["signal"] == "high_calories_low_steps"
        assert kwargs["locale"] == "vi"
        assert kwargs["surface"] == "web"
        return {
            "category": "activity",
            "priority": "medium",
            "title": "Đi bộ nhẹ sau bữa ăn",
            "body": "Bạn đã ghi nhiều calo và còn ít bước chân. Hãy đi bộ nhẹ 10 phút nếu thấy khoẻ.",
            "actions": [{"id": "walk", "label": "Đi bộ nhẹ", "type": "walk"}],
        }

    monkeypatch.setattr(advice, "_call_ai_worker_health_advice", fake_ai)

    result = await advice.get_dashboard_ai_advice(db=AsyncMock(), user=user, locale="vi", surface="web")

    assert result.source == "ai"
    assert result.category == "activity"
    assert len(redis.setex_calls) == 2
    assert any(":vi:" in key for key, _ttl, _payload in redis.setex_calls)
    assert any(":latest:" in key for key, _ttl, _payload in redis.setex_calls)


@pytest.mark.asyncio
async def test_dashboard_ai_advice_ai_failure_returns_high_calorie_low_steps_rule(monkeypatch):
    redis = _FakeRedis()
    user = _user()
    context = _context(steps=900, calories=2800)
    _patch_context(monkeypatch, context)
    _patch_redis(monkeypatch, redis)

    async def fail_ai(**_kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("worker offline")

    monkeypatch.setattr(advice, "_call_ai_worker_health_advice", fail_ai)

    result = await advice.get_dashboard_ai_advice(db=AsyncMock(), user=user, locale="en", surface="web")

    assert result.source == "rule"
    assert result.status == "fallback"
    assert result.category == "activity"
    assert any(item.type == "walk" for item in result.actions)
    assert {item.metric for item in result.evidence} >= {"Steps", "Today's calories"}
    assert redis.setex_calls == []


@pytest.mark.asyncio
async def test_dashboard_ai_advice_throttle_skips_live_ai_and_returns_rule(monkeypatch):
    redis = _FakeRedis(throttle_count=advice._THROTTLE_MAX_CALLS)
    user = _user()
    context = _context()
    _patch_context(monkeypatch, context)
    _patch_redis(monkeypatch, redis)

    async def fail_ai(**_kwargs: Any) -> dict[str, Any]:
        raise AssertionError("AI worker should not run when throttled")

    monkeypatch.setattr(advice, "_call_ai_worker_health_advice", fail_ai)

    result = await advice.get_dashboard_ai_advice(db=AsyncMock(), user=user, locale="vi", surface="web")

    assert result.source == "rule"
    assert redis.incr_calls == [advice._throttle_key(user.id)]


@pytest.mark.asyncio
async def test_dashboard_ai_advice_rejects_unsafe_ai_text_without_cache(monkeypatch):
    redis = _FakeRedis()
    user = _user()
    context = _context()
    _patch_context(monkeypatch, context)
    _patch_redis(monkeypatch, redis)

    async def unsafe_ai(**_kwargs: Any) -> dict[str, Any]:
        return {
            "category": "medication",
            "priority": "high",
            "title": "Change medication dose",
            "body": "Increase dose today.",
            "actions": [{"id": "bad", "label": "Change medication", "type": "open_chat"}],
        }

    monkeypatch.setattr(advice, "_call_ai_worker_health_advice", unsafe_ai)

    result = await advice.get_dashboard_ai_advice(db=AsyncMock(), user=user, locale="en", surface="web")

    assert result.source == "rule"
    assert redis.setex_calls == []

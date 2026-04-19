"""Unit tests for ai_chat_orchestrator concurrency + rate limiting + payload."""
from __future__ import annotations

import pytest

from app.services import ai_chat_orchestrator


# ── Concurrency guard ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_concurrency_guard_allows_within_limit():
    guard = ai_chat_orchestrator._ConcurrencyGuard()
    assert await guard.try_acquire("u1", limit=2) is True
    assert await guard.try_acquire("u1", limit=2) is True
    assert await guard.try_acquire("u1", limit=2) is False
    await guard.release("u1")
    assert await guard.try_acquire("u1", limit=2) is True


@pytest.mark.asyncio
async def test_concurrency_guard_release_below_zero_is_safe():
    guard = ai_chat_orchestrator._ConcurrencyGuard()
    await guard.release("u1")
    assert guard.in_flight("u1") == 0


# ── Rate limiter ────────────────────────────────────────────────────────────

def test_rate_limiter_allows_up_to_cap():
    limiter = ai_chat_orchestrator._AiRateLimiter()
    for _ in range(3):
        assert limiter.allow("user-a", max_per_minute=3) is True
    assert limiter.allow("user-a", max_per_minute=3) is False


def test_rate_limiter_isolates_users():
    limiter = ai_chat_orchestrator._AiRateLimiter()
    assert limiter.allow("user-a", max_per_minute=1) is True
    assert limiter.allow("user-a", max_per_minute=1) is False
    assert limiter.allow("user-b", max_per_minute=1) is True


# ── Worker error formatting ────────────────────────────────────────────────

def test_format_worker_error_message_known_codes():
    assert "API key" in ai_chat_orchestrator._format_worker_error_message(
        {"code": "AI_UNCONFIGURED"}
    )
    assert "quá lâu" in ai_chat_orchestrator._format_worker_error_message(
        {"code": "AI_TIMEOUT"}
    )
    assert "không thể trả lời" in ai_chat_orchestrator._format_worker_error_message(
        {"code": "AI_SAFETY_BLOCKED"}
    )


def test_format_worker_error_message_unknown_code_falls_back():
    msg = ai_chat_orchestrator._format_worker_error_message({"code": "X"})
    assert "không phản hồi" in msg


# ── extract_worker_error parsing ───────────────────────────────────────────

class _StubResponse:
    def __init__(self, status_code: int, body: dict | str) -> None:
        self.status_code = status_code
        self._body = body
        self.text = body if isinstance(body, str) else "raw"

    def json(self):
        if isinstance(self._body, dict):
            return self._body
        raise ValueError("not json")


class _StubHTTPStatusError(Exception):
    def __init__(self, response: _StubResponse) -> None:
        self.response = response


def test_extract_worker_error_with_detail_dict():
    err = _StubHTTPStatusError(_StubResponse(503, {"detail": {"code": "AI_UNCONFIGURED", "message": "missing"}}))
    parsed = ai_chat_orchestrator._extract_worker_error(err)  # type: ignore[arg-type]
    assert parsed["code"] == "AI_UNCONFIGURED"


def test_extract_worker_error_with_plain_text_body():
    err = _StubHTTPStatusError(_StubResponse(500, "internal explosion"))
    parsed = ai_chat_orchestrator._extract_worker_error(err)  # type: ignore[arg-type]
    assert parsed["code"] == "HTTP_500"
    assert "internal explosion" in parsed["message"]

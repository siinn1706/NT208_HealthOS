"""Integration tests for ``/api/ai/chat`` and ``/api/ai/chat/stream``."""
from __future__ import annotations

from typing import Any, AsyncIterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat import ChatReply, ChatUsage

client = TestClient(app)


def test_chat_endpoint_returns_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_generate(request: Any) -> ChatReply:
        return ChatReply(
            reply="Đây là câu trả lời từ AI.",
            model="gemini-2.0-flash",
            usage=ChatUsage(prompt_tokens=5, completion_tokens=10, total_tokens=15),
            finish_reason="stop",
            latency_ms=120,
        )

    monkeypatch.setattr(
        "app.api.generate.gemini_chat_service.generate_chat_reply", fake_generate
    )

    response = client.post(
        "/api/ai/chat",
        json={
            "messages": [{"role": "user", "content": "Xin chào"}],
            "system_prompt": "Bạn là HealthOS AI.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Đây là câu trả lời từ AI."
    assert body["usage"]["completion_tokens"] == 10
    assert body["finish_reason"] == "stop"


def test_chat_endpoint_unconfigured_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services.gemini_chat_service import GeminiChatUnavailableError

    async def fake_generate(request: Any) -> ChatReply:
        raise GeminiChatUnavailableError("missing key")

    monkeypatch.setattr(
        "app.api.generate.gemini_chat_service.generate_chat_reply", fake_generate
    )

    response = client.post(
        "/api/ai/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "AI_UNCONFIGURED"


def test_chat_stream_emits_sse(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_stream(request: Any) -> AsyncIterator[tuple[str, dict | None]]:
        yield ("Hello ", None)
        yield ("world", None)
        yield (
            "",
            {
                "model": "gemini-2.0-flash",
                "usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
                "finish_reason": "stop",
                "latency_ms": 42,
                "safety_blocked": False,
            },
        )

    monkeypatch.setattr(
        "app.api.generate.gemini_chat_service.stream_chat_reply", fake_stream
    )

    with client.stream(
        "POST",
        "/api/ai/chat/stream",
        json={"messages": [{"role": "user", "content": "hi"}]},
    ) as response:
        assert response.status_code == 200
        body = "".join(response.iter_text())

    assert '"delta": "Hello "' in body
    assert '"delta": "world"' in body
    assert '"finish": true' in body
    assert '"finish_reason": "stop"' in body


def test_legacy_generate_endpoint_falls_back_when_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.gemini_chat_service import GeminiChatUnavailableError

    async def fake_generate(request: Any) -> ChatReply:
        raise GeminiChatUnavailableError("missing key")

    monkeypatch.setattr(
        "app.api.generate.gemini_chat_service.generate_chat_reply", fake_generate
    )

    response = client.post(
        "/api/ai/generate",
        json={"user_id": "u1", "message": "hello", "history": []},
    )

    assert response.status_code == 200
    assert "API key" in response.json()["reply"]

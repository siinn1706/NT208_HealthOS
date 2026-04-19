"""Unit tests for ``gemini_chat_service`` — the SDK-touching code is stubbed
by replacing ``_sync_generate`` / ``_sync_stream_iterator`` instead of trying
to fake the entire ``google.generativeai`` package.
"""
from __future__ import annotations

from typing import Any

import pytest

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatTurn
from app.services import gemini_chat_service
from app.services.gemini_chat_service import (
    GeminiChatBlockedError,
    GeminiChatUnavailableError,
)


class _StubUsage:
    prompt_token_count = 12
    candidates_token_count = 8
    total_token_count = 20


class _StubFinishReason:
    def __init__(self, name: str = "STOP") -> None:
        self.name = name


class _StubCandidate:
    def __init__(self, finish: str = "STOP") -> None:
        self.finish_reason = _StubFinishReason(finish)


class _StubResponse:
    def __init__(
        self,
        text: str = "Xin chào, tôi là HealthOS AI.",
        finish: str = "STOP",
    ) -> None:
        self.text = text
        self.usage_metadata = _StubUsage()
        self.candidates = [_StubCandidate(finish)]


@pytest.fixture(autouse=True)
def _enable_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", "test-key", raising=False)


async def test_generate_chat_reply_returns_text(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def fake_sync(request: ChatRequest, system_prompt: str) -> Any:
        captured["request"] = request
        captured["system_prompt"] = system_prompt
        return _StubResponse()

    monkeypatch.setattr(gemini_chat_service, "_sync_generate", fake_sync)

    request = ChatRequest(
        messages=[ChatTurn(role="user", content="Xin chào")],
        system_prompt="Bạn là HealthOS AI.",
        locale="vi",
    )

    reply = await gemini_chat_service.generate_chat_reply(request)

    assert reply.reply.startswith("Xin chào")
    assert reply.usage.prompt_tokens == 12
    assert reply.usage.completion_tokens == 8
    assert reply.finish_reason == "stop"
    assert reply.safety_blocked is False
    assert "language code: vi" in captured["system_prompt"]
    assert "HealthOS AI" in captured["system_prompt"]


async def test_generate_chat_reply_includes_user_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def fake_sync(request: ChatRequest, system_prompt: str) -> Any:
        captured["system_prompt"] = system_prompt
        return _StubResponse()

    monkeypatch.setattr(gemini_chat_service, "_sync_generate", fake_sync)

    request = ChatRequest(
        messages=[ChatTurn(role="user", content="BMI của tôi là bao nhiêu?")],
        system_prompt="Bạn là HealthOS AI.",
        user_context={"profile": {"bmi": 22.5}},
        locale="vi",
    )

    await gemini_chat_service.generate_chat_reply(request)

    assert "USER_CONTEXT" in captured["system_prompt"]
    assert "22.5" in captured["system_prompt"]
    assert "never reveal email" in captured["system_prompt"]


async def test_generate_chat_reply_requires_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", "", raising=False)
    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])

    with pytest.raises(GeminiChatUnavailableError):
        await gemini_chat_service.generate_chat_reply(request)


async def test_generate_chat_reply_rejects_blocked_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_sync(request: ChatRequest, system_prompt: str) -> Any:
        return _StubResponse(text="", finish="SAFETY")

    monkeypatch.setattr(gemini_chat_service, "_sync_generate", fake_sync)
    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])

    with pytest.raises(GeminiChatBlockedError):
        await gemini_chat_service.generate_chat_reply(request)


async def test_generate_chat_reply_requires_user_last_turn() -> None:
    request = ChatRequest(messages=[ChatTurn(role="assistant", content="hi")])
    with pytest.raises(ValueError):
        await gemini_chat_service.generate_chat_reply(request)


async def test_history_to_gemini_skips_system_role() -> None:
    turns = [
        ChatTurn(role="system", content="ignored"),
        ChatTurn(role="user", content="hi"),
        ChatTurn(role="assistant", content="hello"),
        ChatTurn(role="user", content="how are you?"),
    ]
    result = gemini_chat_service._history_to_gemini(turns)
    assert [t["role"] for t in result] == ["user", "model", "user"]
    assert result[0]["parts"][0]["text"] == "hi"


async def test_stream_chat_reply_yields_chunks_and_final(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class StubStreamChunk:
        def __init__(self, text: str, finish: str = "STOP") -> None:
            self.text = text
            self.candidates = [_StubCandidate(finish)]
            self.usage_metadata = _StubUsage()

    def fake_iterator(request: ChatRequest, system_prompt: str):
        return iter([
            StubStreamChunk("Hello "),
            StubStreamChunk("world", finish="STOP"),
        ])

    monkeypatch.setattr(gemini_chat_service, "_sync_stream_iterator", fake_iterator)

    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])
    chunks: list[tuple[str, dict | None]] = []
    async for delta, final in gemini_chat_service.stream_chat_reply(request):
        chunks.append((delta, final))

    deltas = [c[0] for c in chunks if c[1] is None]
    finals = [c[1] for c in chunks if c[1] is not None]
    assert deltas == ["Hello ", "world"]
    assert len(finals) == 1
    assert finals[0]["finish_reason"] == "stop"
    assert finals[0]["safety_blocked"] is False

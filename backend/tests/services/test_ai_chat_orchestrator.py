"""Unit tests for ai_chat_orchestrator concurrency + rate limiting + payload."""
from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.config import settings
from app.services import ai_chat_orchestrator


class _FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def commit(self):
        return None

    async def execute(self, *_args, **_kwargs):
        return None


class _FakeMessageDTO:
    def __init__(
        self,
        *,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        content: str,
        content_type: str,
        message_id: uuid.UUID | None = None,
    ) -> None:
        self.id = message_id or uuid.uuid4()
        self.conversation_id = conversation_id
        self.sender_id = sender_id
        self.content = content
        self.content_type = content_type

    def model_dump(self, mode: str = "json") -> dict[str, Any]:
        return {
            "id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "sender_id": str(self.sender_id),
            "content": self.content,
            "content_type": self.content_type,
        }


def _patch_orchestrator_db(monkeypatch):
    monkeypatch.setattr(ai_chat_orchestrator, "AsyncSessionLocal", lambda: _FakeSession())


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
    assert "proxy" in ai_chat_orchestrator._format_worker_error_message(
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


@pytest.mark.asyncio
async def test_build_chat_request_payload_sets_reply_token_budget(monkeypatch):
    async def fake_history(*args, **kwargs):
        return [{"role": "user", "content": "Tôi nên ăn gì hôm nay?"}]

    async def fake_user(*args, **kwargs):
        return None

    monkeypatch.setattr(settings, "ai_chat_reply_max_tokens", 2048, raising=False)
    monkeypatch.setattr(ai_chat_orchestrator, "_load_recent_history", fake_history)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_user)

    payload = await ai_chat_orchestrator._build_chat_request_payload(
        AsyncMock(),
        uuid.uuid4(),
        uuid.uuid4(),
        uuid.uuid4(),
    )

    assert payload["max_tokens"] == 2048


@pytest.mark.asyncio
async def test_build_chat_request_payload_skips_rag_for_non_health(monkeypatch):
    async def fake_history(*args, **kwargs):
        return [{"role": "user", "content": "What is the capital of France?"}]

    async def fake_user(*args, **kwargs):
        return None

    async def fail_retrieve(*_args, **_kwargs):
        raise AssertionError("RAG should not run for non-health messages")

    monkeypatch.setattr(ai_chat_orchestrator, "_load_recent_history", fake_history)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_user)
    monkeypatch.setattr(ai_chat_orchestrator.medical_rag, "retrieve_medical_context", fail_retrieve)

    payload = await ai_chat_orchestrator._build_chat_request_payload(
        AsyncMock(),
        uuid.uuid4(),
        uuid.uuid4(),
        uuid.uuid4(),
    )

    assert "rag_context" not in payload
    assert "safety_context" not in payload


@pytest.mark.asyncio
async def test_build_chat_request_payload_adds_rag_for_health_query(monkeypatch):
    async def fake_history(*args, **kwargs):
        return [{"role": "user", "content": "Can exercise help my blood pressure?"}]

    async def fake_user(*args, **kwargs):
        return None

    async def fake_retrieve(*_args, **_kwargs):
        return ai_chat_orchestrator.medical_rag.MedicalRagResult(
            sources=[
                ai_chat_orchestrator.medical_rag.MedicalRagSource(
                    id="S1",
                    title="High blood pressure overview",
                    organization="CDC",
                    url="https://example.test/bp",
                    excerpt="Regular activity can support blood pressure management.",
                    score=0.91,
                )
            ],
            limited=False,
        )

    monkeypatch.setattr(ai_chat_orchestrator, "_load_recent_history", fake_history)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_user)
    monkeypatch.setattr(ai_chat_orchestrator.medical_rag, "retrieve_medical_context", fake_retrieve)

    payload = await ai_chat_orchestrator._build_chat_request_payload(
        AsyncMock(),
        uuid.uuid4(),
        uuid.uuid4(),
        uuid.uuid4(),
    )

    assert payload["safety_context"]["level"] == "routine"
    assert payload["rag_context"]["sources"][0]["title"] == "High blood pressure overview"
    assert "embedding" not in payload["rag_context"]["sources"][0]


@pytest.mark.asyncio
async def test_trigger_ai_reply_emergency_non_streaming_never_calls_worker(monkeypatch):
    _patch_orchestrator_db(monkeypatch)
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    broadcasts: list[tuple[str, dict[str, Any], str]] = []
    sent: dict[str, Any] = {}

    async def fake_ensure_ai_bot_member(db, conv_id):
        return bot_id

    async def fake_fetch_user(db, user_id):
        profile = type("Profile", (), {"preferred_language": "en"})()
        return type("User", (), {"profile": profile})()

    async def fake_send_message(db, **kwargs):
        sent.update(kwargs)
        return _FakeMessageDTO(**kwargs)

    async def fail_payload(*_args, **_kwargs):
        raise AssertionError("payload must not be built for emergency messages")

    async def fail_post(_payload):
        raise AssertionError("AI worker must not be called for emergency messages")

    async def broadcast(room, payload, event_name):
        broadcasts.append((room, payload, event_name))

    user_id_str = f"emergency-{user_id}"
    monkeypatch.setattr(settings, "ai_chat_max_concurrent_per_user", 1, raising=False)
    assert await ai_chat_orchestrator.get_concurrency_guard().try_acquire(user_id_str, 1)
    monkeypatch.setattr(ai_chat_orchestrator.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_fetch_user)
    monkeypatch.setattr(ai_chat_orchestrator.chat_svc, "send_message", fake_send_message)
    monkeypatch.setattr(ai_chat_orchestrator, "_build_chat_request_payload", fail_payload)
    monkeypatch.setattr(ai_chat_orchestrator, "_post_to_worker", fail_post)

    try:
        result = await ai_chat_orchestrator.trigger_ai_reply(
            conversation_id=conversation_id,
            user_id=user_id,
            user_id_str=user_id_str,
            broadcast=broadcast,
            use_streaming=False,
            latest_user_message_content="I have crushing chest pain",
        )
    finally:
        await ai_chat_orchestrator.get_concurrency_guard().release(user_id_str)

    assert result is not None
    assert sent["sender_id"] == bot_id
    assert sent["content_type"] == "system"
    assert "not emergency care" in sent["content"]
    assert broadcasts[0][0] == f"conv:{conversation_id}"
    assert broadcasts[0][2] == "msg:new"


@pytest.mark.asyncio
async def test_trigger_ai_reply_emergency_streaming_never_calls_worker(monkeypatch):
    _patch_orchestrator_db(monkeypatch)
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    broadcasts: list[tuple[str, dict[str, Any], str]] = []

    async def fake_ensure_ai_bot_member(db, conv_id):
        return bot_id

    async def fake_fetch_user(db, user_id):
        return None

    async def fake_send_message(db, **kwargs):
        return _FakeMessageDTO(**kwargs)

    async def fail_payload(*_args, **_kwargs):
        raise AssertionError("payload must not be built for emergency messages")

    async def fail_stream(_payload):
        raise AssertionError("AI stream must not be called for emergency messages")
        yield "", None

    async def broadcast(room, payload, event_name):
        broadcasts.append((room, payload, event_name))

    monkeypatch.setattr(ai_chat_orchestrator.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_fetch_user)
    monkeypatch.setattr(ai_chat_orchestrator.chat_svc, "send_message", fake_send_message)
    monkeypatch.setattr(ai_chat_orchestrator, "_build_chat_request_payload", fail_payload)
    monkeypatch.setattr(ai_chat_orchestrator, "_stream_from_worker", fail_stream)

    result = await ai_chat_orchestrator.trigger_ai_reply(
        conversation_id=conversation_id,
        user_id=user_id,
        user_id_str=f"stream-emergency-{user_id}",
        broadcast=broadcast,
        use_streaming=True,
        latest_user_message_content="Tôi khó thở và đau ngực",
    )

    assert result is not None
    assert result.content_type == "system"
    assert broadcasts[-1][2] == "msg:new"


@pytest.mark.asyncio
async def test_trigger_ai_reply_non_emergency_non_streaming_calls_worker(monkeypatch):
    _patch_orchestrator_db(monkeypatch)
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    calls: dict[str, int] = {"payload": 0, "post": 0}
    broadcasts: list[tuple[str, dict[str, Any], str]] = []

    async def fake_ensure_ai_bot_member(db, conv_id):
        return bot_id

    async def fake_fetch_user(db, user_id):
        return None

    async def fake_payload(*_args, **_kwargs):
        calls["payload"] += 1
        return {"messages": [{"role": "user", "content": "How can I sleep better?"}]}

    async def fake_post(payload):
        calls["post"] += 1
        return {
            "reply": "Keep a regular sleep schedule.",
            "usage": {},
            "model": "test-model",
            "finish_reason": "stop",
        }

    async def fake_send_message(db, **kwargs):
        return _FakeMessageDTO(**kwargs)

    async def broadcast(room, payload, event_name):
        broadcasts.append((room, payload, event_name))

    monkeypatch.setattr(ai_chat_orchestrator.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_fetch_user)
    monkeypatch.setattr(ai_chat_orchestrator, "_build_chat_request_payload", fake_payload)
    monkeypatch.setattr(ai_chat_orchestrator, "_post_to_worker", fake_post)
    monkeypatch.setattr(ai_chat_orchestrator.chat_svc, "send_message", fake_send_message)

    result = await ai_chat_orchestrator.trigger_ai_reply(
        conversation_id=conversation_id,
        user_id=user_id,
        user_id_str=f"routine-{user_id}",
        broadcast=broadcast,
        use_streaming=False,
        latest_user_message_content="How can I sleep better?",
    )

    assert result is not None
    assert calls == {"payload": 1, "post": 1}
    assert broadcasts[-1][2] == "msg:new"


@pytest.mark.asyncio
async def test_trigger_ai_reply_non_emergency_streaming_calls_worker_stream(monkeypatch):
    _patch_orchestrator_db(monkeypatch)
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    stream_called = False
    broadcasts: list[tuple[str, dict[str, Any], str]] = []
    final_message_id = uuid.uuid4()

    async def fake_ensure_ai_bot_member(db, conv_id):
        return bot_id

    async def fake_fetch_user(db, user_id):
        return None

    async def fake_payload(*_args, **_kwargs):
        return {"messages": [{"role": "user", "content": "What is a healthy breakfast?"}]}

    async def fake_stream(payload):
        nonlocal stream_called
        stream_called = True
        yield "Eat protein and fiber.", None
        yield "", {"finish": True, "usage": {}, "model": "test-model", "finish_reason": "stop"}

    async def fake_send_message(db, **kwargs):
        return _FakeMessageDTO(message_id=final_message_id, **kwargs)

    async def fake_load_message_dto(db, message_id, conv_id):
        return _FakeMessageDTO(
            message_id=message_id,
            conversation_id=conv_id,
            sender_id=bot_id,
            content="Eat protein and fiber.",
            content_type="text",
        )

    async def broadcast(room, payload, event_name):
        broadcasts.append((room, payload, event_name))

    monkeypatch.setattr(ai_chat_orchestrator.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_fetch_user)
    monkeypatch.setattr(ai_chat_orchestrator, "_build_chat_request_payload", fake_payload)
    monkeypatch.setattr(ai_chat_orchestrator, "_stream_from_worker", fake_stream)
    monkeypatch.setattr(ai_chat_orchestrator.chat_svc, "send_message", fake_send_message)
    monkeypatch.setattr(ai_chat_orchestrator.chat_svc, "_load_message_dto", fake_load_message_dto)

    result = await ai_chat_orchestrator.trigger_ai_reply(
        conversation_id=conversation_id,
        user_id=user_id,
        user_id_str=f"stream-routine-{user_id}",
        broadcast=broadcast,
        use_streaming=True,
        latest_user_message_content="What is a healthy breakfast?",
    )

    assert result is not None
    assert stream_called is True
    assert [item[2] for item in broadcasts] == ["ai:started", "ai:chunk", "ai:completed"]


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

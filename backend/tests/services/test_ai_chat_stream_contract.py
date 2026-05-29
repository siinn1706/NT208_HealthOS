import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.services import ai_chat_context, ai_chat_orchestrator, ai_chat_stream
from app.services.medical_safety import MedicalSafetyLevel


def test_ai_chat_stream_uses_migrated_worker_stream_endpoint() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    assert "/api/ai/chat/stream" in source
    assert "generate-stream" not in source


def test_ai_chat_stream_checks_emergency_before_worker_stream() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    safety_index = source.index("classify_by_rules(prompt)")
    worker_index = source.index("async for chunk, upstream_final_event in _upstream_token_stream(")
    assert safety_index < worker_index
    assert "build_emergency_reply" in source
    assert "assistant_sender_id" in source
    assert "broadcast_message(msg_dto)" in source
    assert "build_chat_request_payload" in source


def test_ai_chat_stream_placeholder_keeps_assistant_sender() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    placeholder_index = source.index("# 1. Insert the placeholder assistant row")
    sender_index = source.index("sender_id=assistant_sender_id", placeholder_index)
    commit_index = source.index("await session.commit()", placeholder_index)
    assert sender_index < commit_index


def test_ai_stream_finalization_does_not_mark_user_edit() -> None:
    root = Path(__file__).resolve().parents[2] / "app" / "services"
    sse_source = (root / "ai_chat_stream.py").read_text(encoding="utf-8")
    ws_source = (root / "ai_chat_orchestrator.py").read_text(encoding="utf-8")

    finalizer_index = sse_source.index("async def _finalize_assistant")
    assert "msg.edited_at =" not in sse_source[finalizer_index:]
    assert "edited_at=datetime.datetime.now" not in ws_source


def test_ai_stream_finalization_persists_model_usage_and_rag_metadata() -> None:
    root = Path(__file__).resolve().parents[2] / "app" / "services"
    sse_source = (root / "ai_chat_stream.py").read_text(encoding="utf-8")

    upstream_index = sse_source.index("final_event[\"rag\"] = rag_metadata")
    finalize_index = sse_source.index("ai_metadata=_ai_metadata_from_stream_final(final_event)")
    writer_index = sse_source.index("msg.ai_metadata = ai_metadata")
    assert upstream_index < finalize_index < writer_index


def test_stream_final_metadata_keeps_operational_proof_without_rag_excerpts() -> None:
    rag = ai_chat_stream._rag_metadata_from_payload(
        {
            "rag_context": {
                "sources": [
                    {
                        "id": "S1",
                        "title": "High blood pressure",
                        "organization": "CDC",
                        "url": "https://example.test/bp",
                        "excerpt": "Long clinical excerpt should stay out of ai_metadata.",
                        "score": 0.91,
                    }
                ],
                "limited": False,
                "reason": None,
            }
        }
    )
    metadata = ai_chat_stream._ai_metadata_from_stream_final(
        {
            "finish": True,
            "model": "oc/deepseek-v4-flash-free",
            "usage": {"prompt_tokens": 12, "completion_tokens": 8, "total_tokens": 20},
            "latency_ms": 345,
            "finish_reason": "stop",
            "safety_blocked": False,
            "rag": rag,
        }
    )

    assert metadata == {
        "model": "oc/deepseek-v4-flash-free",
        "prompt_tokens": 12,
        "completion_tokens": 8,
        "total_tokens": 20,
        "latency_ms": 345,
        "finish_reason": "stop",
        "safety_blocked": False,
        "streamed": True,
        "rag_context_present": True,
        "rag_sources_count": 1,
        "rag_limited": False,
        "rag_reason": None,
        "rag_sources": [
            {
                "id": "S1",
                "title": "High blood pressure",
                "organization": "CDC",
                "url": "https://example.test/bp",
                "score": 0.91,
            }
        ],
    }


def test_ws_router_classifies_emergency_before_ai_rate_limit() -> None:
    router_path = Path(__file__).resolve().parents[2] / "app" / "ws" / "chat_router.py"
    source = router_path.read_text(encoding="utf-8")

    classify_index = source.index("is_emergency_message =")
    rate_limit_index = source.index("get_rate_limiter().allow")
    assert classify_index < rate_limit_index
    assert "not is_emergency_message" in source


class _FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.mark.asyncio
async def test_stream_worker_payload_uses_shared_personal_context_builder(monkeypatch):
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    captured: dict[str, object] = {}

    async def fake_build_chat_request_payload(db, conv_id, uid, bid, **kwargs):
        captured.update(
            {
                "db": db,
                "conversation_id": conv_id,
                "user_id": uid,
                "bot_id": bid,
                **kwargs,
            }
        )
        return {
            "messages": [{"role": "user", "content": "Huyết áp của tôi cao?"}],
            "system_prompt": "prompt",
            "user_context": {"recent_vitals_7d": {"systolic_avg_mmhg": 145}},
            "rag_context": {"sources": [{"id": "S1", "title": "Blood pressure"}]},
            "safety_context": {"level": "routine"},
            "locale": kwargs["locale_override"],
            "max_tokens": 2048,
        }

    monkeypatch.setattr(ai_chat_stream, "AsyncSessionLocal", lambda: _FakeSession())
    monkeypatch.setattr(
        ai_chat_stream,
        "build_chat_request_payload",
        fake_build_chat_request_payload,
    )

    payload = await ai_chat_stream._build_stream_worker_payload(
        prompt="Huyết áp của tôi cao?",
        user_id=user_id,
        conversation_id=conversation_id,
        assistant_sender_id=bot_id,
        locale="vi",
    )

    assert captured["conversation_id"] == conversation_id
    assert captured["user_id"] == user_id
    assert captured["bot_id"] == bot_id
    assert captured["locale_override"] == "vi"
    assert captured["latest_user_message_content"] == "Huyết áp của tôi cao?"
    assert payload["user_context"]["recent_vitals_7d"]["systolic_avg_mmhg"] == 145
    assert payload["rag_context"]["sources"][0]["title"] == "Blood pressure"
    assert payload["safety_context"]["level"] == "routine"


@pytest.mark.asyncio
async def test_stream_worker_payload_fallback_keeps_token_budget(monkeypatch):
    async def fake_prompt(locale: str) -> str:
        return f"prompt-{locale}"

    monkeypatch.setattr(settings, "ai_chat_reply_max_tokens", 2048, raising=False)
    monkeypatch.setattr(ai_chat_context, "build_system_prompt", fake_prompt)

    payload = await ai_chat_stream._build_stream_worker_payload(
        prompt="hello",
        user_id=uuid.uuid4(),
        conversation_id=uuid.uuid4(),
        assistant_sender_id=None,
        locale="en",
    )

    assert payload == {
        "messages": [{"role": "user", "content": "hello"}],
        "system_prompt": "prompt-en",
        "locale": "en",
        "max_tokens": 2048,
    }


@pytest.mark.asyncio
async def test_chat_payload_locale_override_drives_rag_and_system_prompt(monkeypatch):
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    captured: dict[str, object] = {}
    user = SimpleNamespace(
        id=user_id,
        profile=SimpleNamespace(preferred_language="en"),
        preferences=SimpleNamespace(locale="en"),
    )

    async def fake_history(*_args, **_kwargs):
        return [{"role": "user", "content": "What is the capital of France?"}]

    async def fake_user(*_args, **_kwargs):
        return user

    async def fake_system_prompt(locale: str) -> str:
        captured["system_locale"] = locale
        return f"system-{locale}"

    async def fake_user_context(_db, fetched_user):
        captured["context_user"] = fetched_user
        return {"profile": {"bmi": 24.2}}

    def fake_classify(text):
        captured["classified_text"] = text
        return SimpleNamespace(
            level=MedicalSafetyLevel.ROUTINE,
            matched_flags=["blood_pressure"],
            reason="routine_health_terms",
        )

    async def fake_retrieve(_db, query, locale, top_k):
        captured["rag_query"] = query
        captured["rag_locale"] = locale
        captured["rag_top_k"] = top_k
        return ai_chat_orchestrator.medical_rag.MedicalRagResult(
            sources=[
                ai_chat_orchestrator.medical_rag.MedicalRagSource(
                    id="S1",
                    title="High blood pressure",
                    organization="CDC",
                    url="https://example.test/bp",
                    excerpt="Blood pressure guidance.",
                    score=0.9,
                )
            ],
            limited=False,
        )

    monkeypatch.setattr(ai_chat_orchestrator, "_load_recent_history", fake_history)
    monkeypatch.setattr(ai_chat_orchestrator, "_fetch_user_with_profile", fake_user)
    monkeypatch.setattr(ai_chat_orchestrator, "classify_by_rules", fake_classify)
    monkeypatch.setattr(ai_chat_context, "build_system_prompt", fake_system_prompt)
    monkeypatch.setattr(ai_chat_context, "build_user_context", fake_user_context)
    monkeypatch.setattr(
        ai_chat_orchestrator.medical_rag,
        "retrieve_medical_context",
        fake_retrieve,
    )

    payload = await ai_chat_orchestrator.build_chat_request_payload(
        SimpleNamespace(),
        conversation_id,
        user_id,
        bot_id,
        locale_override="vi",
        latest_user_message_content="Huyết áp của tôi cao thì sao?",
    )

    assert payload["locale"] == "vi"
    assert payload["system_prompt"] == "system-vi"
    assert payload["user_context"] == {"profile": {"bmi": 24.2}}
    assert payload["safety_context"]["level"] == "routine"
    assert payload["rag_context"]["sources"][0]["title"] == "High blood pressure"
    assert captured["classified_text"] == "Huyết áp của tôi cao thì sao?"
    assert captured["rag_query"] == "Huyết áp của tôi cao thì sao?"
    assert captured["rag_locale"] == "vi"
    assert captured["context_user"] is user

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
            model="oc/deepseek-v4-flash-free",
            usage=ChatUsage(prompt_tokens=5, completion_tokens=10, total_tokens=15),
            finish_reason="stop",
            latency_ms=120,
        )

    monkeypatch.setattr(
        "app.api.generate.llm_proxy_service.generate_chat_reply", fake_generate
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
    from app.services.llm_proxy_service import LlmProxyUnavailableError

    async def fake_generate(request: Any) -> ChatReply:
        raise LlmProxyUnavailableError("missing config")

    monkeypatch.setattr(
        "app.api.generate.llm_proxy_service.generate_chat_reply", fake_generate
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
                "model": "oc/deepseek-v4-flash-free",
                "usage": {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 3},
                "finish_reason": "stop",
                "latency_ms": 42,
                "safety_blocked": False,
            },
        )

    monkeypatch.setattr(
        "app.api.generate.llm_proxy_service.stream_chat_reply", fake_stream
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


def test_embed_endpoint_returns_embeddings(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_embed(texts: list[str]) -> list[list[float]]:
        assert texts == ["xin chào"]
        return [[0.5] * 384]

    monkeypatch.setattr(
        "app.api.generate.embedding_service.embed_texts", fake_embed
    )

    response = client.post("/api/ai/embed", json={"texts": ["xin chào"]})

    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    assert body["dimension"] == 384
    assert len(body["embeddings"]) == 1
    assert len(body["embeddings"][0]) == 384


def test_embed_endpoint_rejects_empty_texts() -> None:
    response = client.post("/api/ai/embed", json={"texts": []})

    assert response.status_code == 422


def test_embed_endpoint_rejects_too_many_texts() -> None:
    response = client.post("/api/ai/embed", json={"texts": ["hello"] * 33})

    assert response.status_code == 422


def test_embed_endpoint_maps_blank_text_to_bad_request(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_embed(texts: list[str]) -> list[list[float]]:
        raise ValueError("texts must contain non-blank strings.")

    monkeypatch.setattr(
        "app.api.generate.embedding_service.embed_texts", fake_embed
    )

    response = client.post("/api/ai/embed", json={"texts": [" "]})

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "AI_BAD_REQUEST"


def test_legacy_generate_endpoint_falls_back_when_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.services.llm_proxy_service import LlmProxyUnavailableError

    async def fake_generate(request: Any) -> ChatReply:
        raise LlmProxyUnavailableError("missing config")

    monkeypatch.setattr(
        "app.api.generate.llm_proxy_service.generate_chat_reply", fake_generate
    )

    response = client.post(
        "/api/ai/generate",
        json={"user_id": "u1", "message": "hello", "history": []},
    )

    assert response.status_code == 200
    assert "proxy" in response.json()["reply"]

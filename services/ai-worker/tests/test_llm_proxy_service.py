"""Unit tests for the OpenAI-compatible proxy text service."""
from __future__ import annotations

from typing import Any

import httpx
import pytest

from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatTurn
from app.services import llm_proxy_service
from app.services.llm_proxy_service import (
    LlmProxyBlockedError,
    LlmProxyTimeoutError,
    LlmProxyUnavailableError,
)


@pytest.fixture(autouse=True)
def _enable_proxy(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_proxy_base_url", "http://proxy.test/v1", raising=False)
    monkeypatch.setattr(settings, "ai_proxy_model", "oc/deepseek-v4-flash-free", raising=False)
    monkeypatch.setattr(settings, "ai_proxy_api_key", "", raising=False)
    monkeypatch.setattr(settings, "ai_chat_max_tokens", 2048, raising=False)


async def test_generate_chat_reply_posts_openai_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    async def fake_post(payload: dict[str, Any]) -> dict[str, Any]:
        captured["payload"] = payload
        return {
            "model": "oc/deepseek-v4-flash-free",
            "choices": [{"message": {"content": "Xin chào, tôi là HealthOS AI."}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 12, "completion_tokens": 8, "total_tokens": 20},
        }

    monkeypatch.setattr(llm_proxy_service, "_post_completion", fake_post)
    request = ChatRequest(
        messages=[ChatTurn(role="user", content="Xin chào")],
        system_prompt="Bạn là HealthOS AI.",
        user_context={"profile": {"bmi": 22.5}},
        locale="vi",
    )

    reply = await llm_proxy_service.generate_chat_reply(request)

    assert reply.reply.startswith("Xin chào")
    assert reply.model == "oc/deepseek-v4-flash-free"
    assert reply.usage.prompt_tokens == 12
    assert captured["payload"]["model"] == "oc/deepseek-v4-flash-free"
    assert captured["payload"]["max_tokens"] == 2048
    assert captured["payload"]["stream"] is False
    assert captured["payload"]["messages"][0]["role"] == "system"
    assert "USER_CONTEXT" in captured["payload"]["messages"][0]["content"]
    assert "sufficiently detailed" in captured["payload"]["messages"][0]["content"]
    assert "hidden chain-of-thought" in captured["payload"]["messages"][0]["content"]
    assert captured["payload"]["messages"][-1] == {"role": "user", "content": "Xin chào"}


async def test_generate_chat_reply_requires_proxy_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_proxy_base_url", "", raising=False)
    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])

    with pytest.raises(LlmProxyUnavailableError):
        await llm_proxy_service.generate_chat_reply(request)


async def test_generate_chat_reply_rejects_content_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_post(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "choices": [{"message": {"content": ""}, "finish_reason": "content_filter"}],
        }

    monkeypatch.setattr(llm_proxy_service, "_post_completion", fake_post)
    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])

    with pytest.raises(LlmProxyBlockedError):
        await llm_proxy_service.generate_chat_reply(request)


async def test_generate_chat_reply_requires_user_last_turn() -> None:
    request = ChatRequest(messages=[ChatTurn(role="assistant", content="hi")])
    with pytest.raises(ValueError):
        await llm_proxy_service.generate_chat_reply(request)


async def test_post_completion_maps_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    class TimeoutClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            pass

        async def __aenter__(self) -> "TimeoutClient":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        async def post(self, *args: Any, **kwargs: Any) -> httpx.Response:
            raise httpx.TimeoutException("slow")

    monkeypatch.setattr(llm_proxy_service.httpx, "AsyncClient", TimeoutClient)

    with pytest.raises(LlmProxyTimeoutError):
        await llm_proxy_service._post_completion({"messages": [], "model": "m"})


async def test_stream_chat_reply_parses_sse(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class StreamResponse:
        def raise_for_status(self) -> None:
            return None

        async def aiter_lines(self):
            yield 'data: {"model":"oc/deepseek-v4-flash-free","choices":[{"delta":{"content":"Huyết"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" áp"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" là"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":3,"total_tokens":4}}'
            yield "data: [DONE]"

    class StreamContext:
        async def __aenter__(self) -> StreamResponse:
            return StreamResponse()

        async def __aexit__(self, *args: Any) -> None:
            return None

    class StreamClient:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            pass

        async def __aenter__(self) -> "StreamClient":
            return self

        async def __aexit__(self, *args: Any) -> None:
            return None

        def stream(self, method: str, url: str, **kwargs: Any) -> StreamContext:
            captured["method"] = method
            captured["url"] = url
            captured["json"] = kwargs.get("json")
            return StreamContext()

    monkeypatch.setattr(llm_proxy_service.httpx, "AsyncClient", StreamClient)
    request = ChatRequest(messages=[ChatTurn(role="user", content="hi")])

    chunks: list[tuple[str, dict | None]] = []
    async for delta, final in llm_proxy_service.stream_chat_reply(request):
        chunks.append((delta, final))

    assert captured["url"] == "http://proxy.test/v1/chat/completions"
    assert captured["json"]["stream"] is True
    assert captured["json"]["max_tokens"] == 2048
    assert [item[0] for item in chunks if item[1] is None] == ["Huyết", " áp", " là"]
    final = [item[1] for item in chunks if item[1] is not None][0]
    assert final["model"] == "oc/deepseek-v4-flash-free"
    assert final["usage"]["total_tokens"] == 4
    assert final["finish_reason"] == "stop"


async def test_generate_exercise_suggestions_parses_json(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_post(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "choices": [{
                "message": {"content": '[{"id":"ai-walk","title":"Đi bộ","message":"Đi bộ nhẹ.","priority":1}]'},
                "finish_reason": "stop",
            }],
        }

    monkeypatch.setattr(llm_proxy_service, "_post_completion", fake_post)

    result = await llm_proxy_service.generate_exercise_suggestions({"steps": 1000}, count=1)
    assert result[0]["id"] == "ai-walk"
    assert result[0]["icon"] == "Dumbbell"


async def test_generate_report_summary_returns_text(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_post(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "choices": [{"message": {"content": "Các chỉ số ổn định."}, "finish_reason": "stop"}],
        }

    monkeypatch.setattr(llm_proxy_service, "_post_completion", fake_post)

    assert await llm_proxy_service.generate_report_summary({"period": "week"}) == "Các chỉ số ổn định."

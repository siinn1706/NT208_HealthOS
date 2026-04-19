"""Wrapper around Google Generative AI SDK for chat completion.

Exposes two coroutines:
  - generate_chat_reply(...)  → ChatReply (non-streaming)
  - stream_chat_reply(...)    → async iterator of (delta_text, finish_payload)

Both functions translate ``ChatTurn`` history into Gemini's content format and
embed an optional ``user_context`` JSON snippet into the system prompt.
The SDK calls are blocking (gRPC under the hood), so we run them in the
default executor via ``asyncio.to_thread`` to keep the FastAPI event loop free.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

from app.core.config import settings
from app.schemas.chat import ChatReply, ChatRequest, ChatTurn, ChatUsage

_LOGGER = logging.getLogger(__name__)


class GeminiChatUnavailableError(RuntimeError):
    """Raised when Gemini API is not configured (missing key)."""


class GeminiChatTimeoutError(RuntimeError):
    """Raised when the Gemini call exceeds the configured timeout."""


class GeminiChatBlockedError(RuntimeError):
    """Raised when Gemini's safety filter blocks the response."""


def _build_system_prompt(
    base_prompt: str,
    user_context: dict[str, Any] | None,
    locale: str,
) -> str:
    """Compose the final system prompt sent to Gemini.

    Locale is injected so the model answers in the user's language even when
    the recent history happens to be short.
    """
    parts: list[str] = []
    if base_prompt:
        parts.append(base_prompt.strip())
    parts.append(
        f"Always reply in language code: {locale}. "
        "Keep tone empathetic, concise, evidence-based."
    )
    if user_context:
        ctx_json = json.dumps(user_context, ensure_ascii=False, default=str)
        parts.append(
            "USER_CONTEXT (use this data to personalise your answers but never "
            "echo the raw JSON back to the user, never reveal email/phone/address):\n"
            + ctx_json
        )
    return "\n\n".join(parts)


def _history_to_gemini(messages: list[ChatTurn]) -> list[dict[str, Any]]:
    """Map our ``ChatTurn`` list into Gemini's ``contents`` list.

    Gemini uses roles ``user`` and ``model``; ``system`` is delivered via
    ``system_instruction`` instead. The last turn must be a user turn.
    """
    contents: list[dict[str, Any]] = []
    for turn in messages:
        if turn.role == "system":
            continue
        role = "user" if turn.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn.content}]})
    return contents


def _resolve_model_name(request_model: str | None) -> str:
    return request_model or settings.gemini_chat_model


def _ensure_configured() -> None:
    if not settings.gemini_api_key:
        raise GeminiChatUnavailableError(
            "Gemini chat is not configured (missing GEMINI_API_KEY)."
        )


def _generation_config(request: ChatRequest) -> dict[str, Any]:
    return {
        "temperature": (
            request.temperature
            if request.temperature is not None
            else settings.ai_chat_temperature
        ),
        "max_output_tokens": (
            request.max_tokens
            if request.max_tokens is not None
            else settings.ai_chat_max_tokens
        ),
    }


def _extract_usage(response: Any) -> ChatUsage:
    usage_meta = getattr(response, "usage_metadata", None)
    if not usage_meta:
        return ChatUsage()
    return ChatUsage(
        prompt_tokens=getattr(usage_meta, "prompt_token_count", 0) or 0,
        completion_tokens=getattr(usage_meta, "candidates_token_count", 0) or 0,
        total_tokens=getattr(usage_meta, "total_token_count", 0) or 0,
    )


def _extract_finish_reason(response: Any) -> str:
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return "stop"
    raw = getattr(candidates[0], "finish_reason", None)
    if raw is None:
        return "stop"
    return getattr(raw, "name", str(raw)).lower()


def _is_blocked(response: Any) -> bool:
    """True when Gemini's safety filter rejected the candidate."""
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        prompt_feedback = getattr(response, "prompt_feedback", None)
        block_reason = getattr(prompt_feedback, "block_reason", None) if prompt_feedback else None
        return bool(block_reason)
    finish = _extract_finish_reason(response)
    return finish in {"safety", "recitation", "blocked"}


def _sync_generate(request: ChatRequest, system_prompt: str) -> Any:
    """Blocking Gemini call. Runs inside ``asyncio.to_thread``."""
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=_resolve_model_name(request.model),
        system_instruction=system_prompt or None,
    )
    return model.generate_content(
        contents=_history_to_gemini(request.messages),
        generation_config=_generation_config(request),
        request_options={"timeout": settings.ai_chat_timeout_seconds},
    )


async def generate_chat_reply(request: ChatRequest) -> ChatReply:
    """Run a non-streaming chat completion."""
    _ensure_configured()
    if not request.messages or request.messages[-1].role != "user":
        raise ValueError("messages must end with a user turn.")

    system_prompt = _build_system_prompt(
        request.system_prompt,
        request.user_context,
        request.locale,
    )
    started = time.perf_counter()
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(_sync_generate, request, system_prompt),
            timeout=settings.ai_chat_timeout_seconds + 5.0,
        )
    except asyncio.TimeoutError as exc:
        raise GeminiChatTimeoutError("Gemini chat call timed out.") from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    blocked = _is_blocked(response)
    text = ""
    if not blocked:
        text = (getattr(response, "text", "") or "").strip()
    usage = _extract_usage(response)
    finish_reason = "safety" if blocked else _extract_finish_reason(response)

    if blocked:
        _LOGGER.warning("gemini_chat_blocked finish=%s", finish_reason)
        raise GeminiChatBlockedError("Gemini safety filter blocked the response.")
    if not text:
        raise RuntimeError("Gemini returned an empty response.")

    return ChatReply(
        reply=text,
        model=_resolve_model_name(request.model),
        usage=usage,
        finish_reason=finish_reason,
        safety_blocked=False,
        latency_ms=latency_ms,
    )


def _sync_stream_iterator(request: ChatRequest, system_prompt: str):
    """Blocking generator that yields Gemini stream chunks."""
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name=_resolve_model_name(request.model),
        system_instruction=system_prompt or None,
    )
    return model.generate_content(
        contents=_history_to_gemini(request.messages),
        generation_config=_generation_config(request),
        request_options={"timeout": settings.ai_chat_timeout_seconds},
        stream=True,
    )


async def stream_chat_reply(
    request: ChatRequest,
) -> AsyncIterator[tuple[str, dict[str, Any] | None]]:
    """Yield ``(delta_text, final_payload)`` tuples.

    ``final_payload`` is ``None`` for intermediate chunks and a dict with
    ``model``, ``usage``, ``finish_reason``, ``latency_ms`` for the last one.
    """
    _ensure_configured()
    if not request.messages or request.messages[-1].role != "user":
        raise ValueError("messages must end with a user turn.")

    system_prompt = _build_system_prompt(
        request.system_prompt,
        request.user_context,
        request.locale,
    )
    started = time.perf_counter()

    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, dict[str, Any] | None] | None] = asyncio.Queue()

    def _producer() -> None:
        try:
            response_iter = _sync_stream_iterator(request, system_prompt)
            last_response = None
            for chunk in response_iter:
                last_response = chunk
                if _is_blocked(chunk):
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        ("", {
                            "model": _resolve_model_name(request.model),
                            "usage": ChatUsage().model_dump(),
                            "finish_reason": "safety",
                            "latency_ms": int((time.perf_counter() - started) * 1000),
                            "safety_blocked": True,
                        }),
                    )
                    loop.call_soon_threadsafe(queue.put_nowait, None)
                    return
                delta = (getattr(chunk, "text", "") or "")
                if delta:
                    loop.call_soon_threadsafe(queue.put_nowait, (delta, None))
            usage = _extract_usage(last_response) if last_response else ChatUsage()
            finish_reason = _extract_finish_reason(last_response) if last_response else "stop"
            loop.call_soon_threadsafe(
                queue.put_nowait,
                ("", {
                    "model": _resolve_model_name(request.model),
                    "usage": usage.model_dump(),
                    "finish_reason": finish_reason,
                    "latency_ms": int((time.perf_counter() - started) * 1000),
                    "safety_blocked": False,
                }),
            )
        except Exception as exc:  # noqa: BLE001 - relay any error
            loop.call_soon_threadsafe(
                queue.put_nowait,
                ("", {
                    "model": _resolve_model_name(request.model),
                    "usage": ChatUsage().model_dump(),
                    "finish_reason": "error",
                    "latency_ms": int((time.perf_counter() - started) * 1000),
                    "safety_blocked": False,
                    "error": str(exc),
                }),
            )
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    producer_task = asyncio.get_running_loop().run_in_executor(None, _producer)
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    finally:
        await producer_task


def is_configured() -> bool:
    return bool(settings.gemini_api_key)

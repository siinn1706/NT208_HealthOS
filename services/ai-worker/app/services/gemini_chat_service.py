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


# ── Exercise Suggestions ───────────────────────────────────────────────────────

_EXERCISE_SYSTEM_PROMPT = """\
Bạn là chuyên gia tư vấn thể dục y học của HealthOS. Dựa trên dữ liệu sức khoẻ thực tế của người dùng, \
hãy đưa ra tối đa {count} gợi ý luyện tập cá nhân hoá, khoa học và an toàn.

Nguyên tắc bắt buộc:
- Phân tích kỹ các chỉ số: nhịp tim, huyết áp, bước chân, giấc ngủ, BMI, nguy cơ bệnh, dinh dưỡng.
- AN TOÀN TRƯỚC TIÊN: nhịp tim > 100 bpm hoặc huyết áp tâm thu > 140 mmHg → chỉ gợi ý thở/thiền/yoga nhẹ.
- Dùng kiến thức y học thể thao hiện đại (ACSM guidelines, WHO physical activity recommendations 2020).
- Viết title ngắn gọn (≤ 8 từ), message CỤ THỂ có số liệu thực từ dữ liệu người dùng, có kỹ thuật tập.
- Ví dụ message tốt: "Nhịp tim trung bình 7 ngày của bạn là 92 bpm — cao hơn bình thường. Thực hiện hít thở 4-7-8: hít 4 giây, nín 7 giây, thở ra 8 giây, lặp 4 lần để hạ nhịp tim."
- KHÔNG chẩn đoán bệnh, KHÔNG kê thuốc. Khuyến khích gặp bác sĩ khi triệu chứng nghiêm trọng.
- Trả lời bằng tiếng Việt.

Chọn icon phù hợp từ: Dumbbell (tạ/sức mạnh), Flame (cardio/đốt mỡ), Heart (tim/thở), \
Footprints (đi bộ/chạy), Moon (ngủ/phục hồi), Zap (HIIT/năng lượng cao), \
Target (yoga/linh hoạt), CheckCircle (duy trì/cân bằng), Lightbulb (mẹo sức khoẻ).
"""

_EXERCISE_JSON_SCHEMA = """\
Trả về JSON array (không có markdown code block, chỉ JSON thuần) theo schema sau:
[
  {{
    "id": "string — kebab-case duy nhất, ví dụ: ai-cardio-boost",
    "type": "warning | tip | goal | success",
    "icon": "Dumbbell | Flame | Heart | Footprints | Moon | Zap | Target | CheckCircle | Lightbulb",
    "title": "Tiêu đề ngắn ≤ 8 từ",
    "message": "Mô tả cụ thể 2–3 câu, có số liệu thực, có kỹ thuật tập",
    "priority": 1,
    "duration_minutes": 30,
    "intensity": "low | medium | high",
    "category": "cardio | strength | flexibility | balance"
  }}
]
Quy tắc priority: 1 = khẩn cấp/cảnh báo, 2 = quan trọng, 3 = khuyến khích, 4 = duy trì.
Trả về tối đa {count} phần tử, sắp xếp theo priority tăng dần.
"""


def _build_search_tool() -> Any | None:
    """Construct a Google Search grounding tool for Gemini.

    google-generativeai==0.8.5 only ships ``google_search_retrieval`` (a
    Gemini 1.5 feature). Combining it with ``gemini-2.0-flash`` causes the
    server to reject the request, so we currently disable search grounding
    and rely solely on Gemini's pre-trained exercise-science knowledge plus
    the user-context (RAG) JSON. The benefit of staying in pure JSON mode:
    we can use ``response_mime_type='application/json'`` for reliable output.
    """
    return None


def _sync_generate_exercise(
    user_context: dict[str, Any],
    count: int,
    locale: str,
) -> str:
    """Blocking Gemini call for exercise suggestions. Runs inside asyncio.to_thread.

    Pipeline:
      1. RAG: user's health snapshot (vitals 7d, meals, profile, risks) is
         injected into the user message as JSON.
      2. Web search: Google Search grounding tool is attached so Gemini can
         pull current ACSM / WHO physical-activity guidelines when relevant.
      3. The model is asked to emit a JSON array. Search grounding precludes
         ``response_mime_type='application/json'``, so we parse the JSON
         from the plain-text response (markdown fences are stripped client-side).
    """
    import google.generativeai as genai

    _ensure_configured()
    genai.configure(api_key=settings.gemini_api_key)

    system_prompt = _EXERCISE_SYSTEM_PROMPT.format(count=count)
    json_schema = _EXERCISE_JSON_SCHEMA.format(count=count)

    ctx_json = json.dumps(user_context, ensure_ascii=False, default=str)
    user_message = (
        "Hãy phân tích dữ liệu sức khoẻ sau (RAG context từ database người dùng) và, "
        "khi cần, dùng Google Search để tra cứu hướng dẫn luyện tập y học mới nhất "
        "(ACSM 2024, WHO Physical Activity Guidelines 2020) cho người có chỉ số tương tự.\n\n"
        f"DỮ LIỆU NGƯỜI DÙNG:\n{ctx_json}\n\n"
        f"YÊU CẦU OUTPUT:\n{json_schema}\n\n"
        "QUAN TRỌNG: Chỉ trả về JSON array thuần — không thêm văn bản giải thích, "
        "không bọc trong code fence ```json. Bắt đầu bằng `[` và kết thúc bằng `]`."
    )

    search_tool = _build_search_tool()
    tools = [search_tool] if search_tool is not None else None

    # response_mime_type cannot be combined with search grounding,
    # so we rely on prompt + post-parse to enforce JSON.
    generation_config: dict[str, Any] = {
        "temperature": 0.4,
        "max_output_tokens": 1024,
    }
    if tools is None:
        # No search → strict JSON mode for higher reliability.
        generation_config["response_mime_type"] = "application/json"

    model = genai.GenerativeModel(
        model_name=settings.gemini_chat_model,
        system_instruction=system_prompt,
        generation_config=generation_config,
        tools=tools,
    )

    response = model.generate_content(
        contents=[{"role": "user", "parts": [{"text": user_message}]}],
        request_options={"timeout": settings.ai_chat_timeout_seconds},
    )
    return (getattr(response, "text", "") or "").strip()


async def generate_exercise_suggestions(
    user_context: dict[str, Any],
    count: int = 3,
    locale: str = "vi",
) -> list[dict[str, Any]]:
    """Generate AI-powered exercise suggestions from user health context.

    Returns a list of suggestion dicts matching ExerciseSuggestionDTO schema.
    Raises on API errors — callers should fall back to rule-based logic.
    """
    _ensure_configured()

    raw_text = await asyncio.wait_for(
        asyncio.to_thread(_sync_generate_exercise, user_context, count, locale),
        timeout=settings.ai_chat_timeout_seconds + 5.0,
    )

    # Strip any accidental markdown fences
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            line for line in lines if not line.startswith("```")
        ).strip()

    suggestions: list[dict[str, Any]] = json.loads(text)
    if not isinstance(suggestions, list):
        raise ValueError(f"Expected JSON array, got: {type(suggestions)}")

    # Validate required fields and normalise
    valid = []
    allowed_types = {"warning", "tip", "goal", "success"}
    allowed_icons = {
        "Dumbbell", "Flame", "Heart", "Footprints", "Moon",
        "Zap", "Target", "CheckCircle", "Lightbulb",
    }
    allowed_intensities = {"low", "medium", "high"}
    allowed_categories = {"cardio", "strength", "flexibility", "balance"}

    for item in suggestions[:count]:
        if not isinstance(item, dict):
            continue
        item["type"] = item.get("type", "tip") if item.get("type") in allowed_types else "tip"
        item["icon"] = item.get("icon", "Dumbbell") if item.get("icon") in allowed_icons else "Dumbbell"
        item["intensity"] = item.get("intensity", "medium") if item.get("intensity") in allowed_intensities else "medium"
        item["category"] = item.get("category", "cardio") if item.get("category") in allowed_categories else "cardio"
        item.setdefault("id", f"ai-suggestion-{len(valid)}")
        item.setdefault("title", "Gợi ý luyện tập")
        item.setdefault("message", "")
        item.setdefault("priority", len(valid) + 1)
        item.setdefault("duration_minutes", 30)
        valid.append(item)

    return valid

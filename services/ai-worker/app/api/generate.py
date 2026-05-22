"""AI worker chat endpoints.

Two routes are exposed under ``/api/ai``:

  * ``POST /api/ai/chat``         — non-streaming Gemini reply (JSON).
  * ``POST /api/ai/chat/stream``  — Server-Sent Events stream of token deltas.
  * ``POST /api/ai/generate``     — Legacy adapter that proxies into ``/chat``
                                    so older callers keep working. Deprecated.

Errors are surfaced as HTTP 4xx/5xx with a JSON ``{code, message}`` body so
the BE orchestrator can map them to user-facing system messages.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from typing import Any

from app.schemas.chat import ChatReply, ChatRequest, ChatTurn
from app.services import gemini_chat_service
from app.services.gemini_chat_service import (
    GeminiChatBlockedError,
    GeminiChatTimeoutError,
    GeminiChatUnavailableError,
)

router = APIRouter(prefix="/api/ai")
_LOGGER = logging.getLogger(__name__)


# ── Legacy schemas (kept so existing callers using /api/ai/generate don't break) ──
class AIGenerateRequest(BaseModel):
    user_id: str
    message: str
    history: list[dict] = []


class AIGenerateResponse(BaseModel):
    reply: str


# ── /api/ai/chat ──────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatReply)
async def chat_completion(payload: ChatRequest) -> ChatReply:
    """Run a non-streaming Gemini chat completion."""
    try:
        return await gemini_chat_service.generate_chat_reply(payload)
    except GeminiChatUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_UNCONFIGURED", "message": str(exc)},
        ) from exc
    except GeminiChatTimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail={"code": "AI_TIMEOUT", "message": str(exc)},
        ) from exc
    except GeminiChatBlockedError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "AI_SAFETY_BLOCKED", "message": str(exc)},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "AI_BAD_REQUEST", "message": str(exc)},
        ) from exc
    except Exception as exc:  # pragma: no cover - upstream/runtime path
        _LOGGER.exception("ai_chat_failed")
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_UPSTREAM_ERROR", "message": str(exc)},
        ) from exc


# ── /api/ai/chat/stream ───────────────────────────────────────────────────────
@router.post("/chat/stream")
async def chat_completion_stream(payload: ChatRequest) -> StreamingResponse:
    """Stream Gemini deltas as Server-Sent Events.

    Each line: ``data: {"delta": "...", "finish": false}\\n\\n``.
    Terminator: ``data: {"finish": true, "usage": {...}, "model": "...",
    "finish_reason": "stop", "latency_ms": 1234}\\n\\n``.
    """

    async def event_source():
        try:
            async for delta, final in gemini_chat_service.stream_chat_reply(payload):
                if final is None:
                    yield "data: " + json.dumps({"delta": delta, "finish": False}) + "\n\n"
                else:
                    final_event = {
                        "finish": True,
                        "model": final.get("model"),
                        "usage": final.get("usage", {}),
                        "finish_reason": final.get("finish_reason", "stop"),
                        "latency_ms": final.get("latency_ms", 0),
                        "safety_blocked": final.get("safety_blocked", False),
                    }
                    if "error" in final:
                        final_event["error"] = final["error"]
                    yield "data: " + json.dumps(final_event) + "\n\n"
        except GeminiChatUnavailableError as exc:
            yield "data: " + json.dumps({
                "finish": True,
                "finish_reason": "error",
                "error_code": "AI_UNCONFIGURED",
                "error": str(exc),
            }) + "\n\n"
        except GeminiChatTimeoutError as exc:
            yield "data: " + json.dumps({
                "finish": True,
                "finish_reason": "error",
                "error_code": "AI_TIMEOUT",
                "error": str(exc),
            }) + "\n\n"
        except GeminiChatBlockedError as exc:
            yield "data: " + json.dumps({
                "finish": True,
                "finish_reason": "safety",
                "safety_blocked": True,
                "error": str(exc),
            }) + "\n\n"
        except ValueError as exc:
            yield "data: " + json.dumps({
                "finish": True,
                "finish_reason": "error",
                "error_code": "AI_BAD_REQUEST",
                "error": str(exc),
            }) + "\n\n"
        except Exception as exc:  # pragma: no cover - runtime path
            _LOGGER.exception("ai_chat_stream_failed")
            yield "data: " + json.dumps({
                "finish": True,
                "finish_reason": "error",
                "error_code": "AI_UPSTREAM_ERROR",
                "error": str(exc),
            }) + "\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream")


# ── /api/ai/exercise-suggestions ─────────────────────────────────────────────

class ExerciseSuggestionsRequest(BaseModel):
    user_context: dict[str, Any]
    count: int = 3
    locale: str = "vi"


class ExerciseSuggestionsResponse(BaseModel):
    suggestions: list[dict[str, Any]]


@router.post("/exercise-suggestions", response_model=ExerciseSuggestionsResponse)
async def exercise_suggestions(payload: ExerciseSuggestionsRequest) -> ExerciseSuggestionsResponse:
    """Generate AI-powered exercise suggestions using user health context (RAG)."""
    try:
        items = await gemini_chat_service.generate_exercise_suggestions(
            user_context=payload.user_context,
            count=payload.count,
            locale=payload.locale,
        )
        return ExerciseSuggestionsResponse(suggestions=items)
    except GeminiChatUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_UNCONFIGURED", "message": str(exc)},
        ) from exc
    except GeminiChatTimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail={"code": "AI_TIMEOUT", "message": str(exc)},
        ) from exc
    except GeminiChatBlockedError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "AI_SAFETY_BLOCKED", "message": str(exc)},
        ) from exc
    except (ValueError, json.JSONDecodeError) as exc:
        _LOGGER.warning("exercise_suggestions_parse_failed reason=%s", exc)
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_PARSE_ERROR", "message": str(exc)},
        ) from exc
    except Exception as exc:
        _LOGGER.exception("exercise_suggestions_failed")
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_UPSTREAM_ERROR", "message": str(exc)},
        ) from exc


# ── /api/ai/report-summary ───────────────────────────────────────────────────

class ReportSummaryRequest(BaseModel):
    report_data: dict[str, Any]
    locale: str = "vi"


class ReportSummaryResponse(BaseModel):
    summary: str


@router.post("/report-summary", response_model=ReportSummaryResponse)
async def report_summary(payload: ReportSummaryRequest) -> ReportSummaryResponse:
    """Generate AI-powered summary for a health report."""
    try:
        text = await gemini_chat_service.generate_report_summary(
            report_data=payload.report_data,
            locale=payload.locale,
        )
        return ReportSummaryResponse(summary=text)
    except GeminiChatUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "AI_UNCONFIGURED", "message": str(exc)},
        ) from exc
    except GeminiChatTimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail={"code": "AI_TIMEOUT", "message": str(exc)},
        ) from exc
    except GeminiChatBlockedError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "AI_SAFETY_BLOCKED", "message": str(exc)},
        ) from exc
    except Exception as exc:
        _LOGGER.exception("report_summary_failed")
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_UPSTREAM_ERROR", "message": str(exc)},
        ) from exc


# ── /api/ai/generate (legacy adapter) ─────────────────────────────────────────
@router.post("/generate", response_model=AIGenerateResponse, deprecated=True)
async def generate_ai_reply(payload: AIGenerateRequest) -> AIGenerateResponse:
    """Legacy stub-compatible endpoint, now backed by Gemini.

    The previous implementation echoed the message back. We translate the
    legacy ``{user_id, message, history}`` shape into a ``ChatRequest`` and
    return only the text. Kept so older callers don't break while they migrate
    to ``/api/ai/chat``.
    """
    history_turns: list[ChatTurn] = []
    for raw in payload.history:
        try:
            role = raw.get("role") or ("user" if raw.get("sender") == "user" else "assistant")
            content = raw.get("content") or raw.get("message") or ""
            if not content:
                continue
            history_turns.append(ChatTurn(role=role, content=str(content)))
        except Exception:
            continue
    history_turns.append(ChatTurn(role="user", content=payload.message))

    chat_req = ChatRequest(
        messages=history_turns,
        system_prompt="You are HealthOS AI Assistant. Be concise and empathetic.",
    )
    try:
        reply = await gemini_chat_service.generate_chat_reply(chat_req)
        return AIGenerateResponse(reply=reply.reply)
    except GeminiChatUnavailableError:
        return AIGenerateResponse(
            reply="Trợ lý AI chưa được cấu hình API key. Vui lòng liên hệ quản trị viên."
        )
    except (GeminiChatTimeoutError, GeminiChatBlockedError, Exception) as exc:
        _LOGGER.warning("legacy_generate_failed reason=%s", exc)
        return AIGenerateResponse(
            reply="Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau."
        )

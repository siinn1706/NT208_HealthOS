"""B7 P6 — Server-Sent Events streaming for AI conversations.

Responsibilities:
  * Persist the user's message immediately so the conversation list shows it
    even if the upstream AI fails.
  * Open a streaming HTTP connection to the AI worker and forward each delta
    to the client as an SSE event.
  * Detect client disconnect (`request.is_disconnected()`) and persist the
    accumulated assistant message with `status='stopped'`.
  * On any failure, persist a `status='failed'` row with the partial text we
    captured so the user sees something in the conversation transcript.

The AI worker is currently a stub. Until it grows a real `/api/ai/generate-stream`
SSE endpoint we fall back to a deterministic local "tokenizer" that splits a
response into chunks at 50 ms intervals — enough to exercise the FE pipeline.

B7 review P2-5 — the streaming generator opens its own short-lived
`AsyncSessionLocal()` rather than borrowing the request-scoped `db` from
`Depends(get_db)`. This frees the request-scoped session for FastAPI to
tear down when the handler returns and prevents the async pool (default
size 20) from being pinned for the duration of every active stream.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
import uuid
from typing import AsyncGenerator

import httpx
from fastapi import Request
from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.core.config import settings
from app.models.core import (
    Message,
    MessageContentTypeEnum,
    MessageStatusEnum,
)

logger = logging.getLogger(__name__)


HEARTBEAT_EVERY_S = 15.0  # idle keepalive — proxies often kill silent SSE connections.


def _sse_event(event: str, data: dict | str) -> str:
    """Build a single SSE frame ending in the mandatory `\n\n` terminator."""
    if isinstance(data, dict):
        data = json.dumps(data, separators=(",", ":"))
    return f"event: {event}\ndata: {data}\n\n"


async def _fallback_token_stream(prompt: str) -> AsyncGenerator[str, None]:
    """Deterministic local fallback while the AI worker is mock.

    Splits a canned reply into ~5-character chunks; the FE accumulator
    treats the chunks identically to a real LLM stream.
    """
    canned = (
        "I'm a virtual health assistant — not a doctor. Here's a general "
        "response to your question; please consult a qualified clinician for "
        "personal medical advice."
    )
    cursor = 0
    while cursor < len(canned):
        next_cut = min(cursor + 5, len(canned))
        chunk = canned[cursor:next_cut]
        cursor = next_cut
        await asyncio.sleep(0.05)
        yield chunk


async def _upstream_token_stream(prompt: str, user_id: uuid.UUID) -> AsyncGenerator[str, None]:
    """Try the AI worker streaming endpoint; fall back gracefully if absent."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.ai_worker_url}/api/ai/generate-stream",
                json={"user_id": str(user_id), "message": prompt, "history": []},
            ) as response:
                if response.status_code != 200:
                    raise RuntimeError(
                        f"ai-worker /api/ai/generate-stream returned {response.status_code}"
                    )
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
                return
    except Exception as exc:  # noqa: BLE001 — falling back is the desired behavior
        logger.info("AI worker stream unavailable (%s); using local fallback", exc)
    async for chunk in _fallback_token_stream(prompt):
        yield chunk


async def stream_assistant_response(
    *,
    request: Request,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    user_message_id: uuid.UUID,
    prompt: str,
) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE frames; persists the assistant message.

    Opens its own short-lived `AsyncSessionLocal()` rather than borrowing
    the request-scoped session, so FastAPI's `get_db` dep can return its
    pool slot the moment the handler returns. (B7 review P2-5.)

    The caller must already have committed the user message before invoking
    this generator — once a `StreamingResponse` returns, the dep teardown
    runs and the request-scoped transaction is gone.
    """
    # 1. Insert the placeholder assistant row in its own short transaction.
    assistant_id: uuid.UUID
    async with AsyncSessionLocal() as session:
        assistant = Message(
            conversation_id=conversation_id,
            sender_id=None,
            content="",
            content_type=MessageContentTypeEnum.TEXT,
            status=MessageStatusEnum.STREAMING.value,
        )
        session.add(assistant)
        await session.flush()
        assistant_id = assistant.id
        await session.commit()

    accumulated: list[str] = []
    seq = 0
    last_emit = asyncio.get_event_loop().time()

    yield _sse_event(
        "start",
        {
            "conversation_id": str(conversation_id),
            "user_message_id": str(user_message_id),
            "assistant_message_id": str(assistant_id),
        },
    )

    try:
        async for chunk in _upstream_token_stream(prompt, user_id):
            if await request.is_disconnected():
                logger.info("Client disconnected during AI stream %s", assistant_id)
                await _finalize_assistant(
                    assistant_id, "".join(accumulated), MessageStatusEnum.STOPPED
                )
                yield _sse_event(
                    "aborted",
                    {"message_id": str(assistant_id), "status": "stopped"},
                )
                return

            accumulated.append(chunk)
            seq += 1
            yield _sse_event("delta", {"text": chunk, "seq": seq})

            now = asyncio.get_event_loop().time()
            if now - last_emit >= HEARTBEAT_EVERY_S:
                yield _sse_event("ping", "")
                last_emit = now
    except Exception as exc:  # noqa: BLE001
        logger.exception("AI stream %s failed", assistant_id)
        await _finalize_assistant(
            assistant_id, "".join(accumulated), MessageStatusEnum.FAILED
        )
        yield _sse_event(
            "error",
            {"message_id": str(assistant_id), "code": "STREAM_FAILED", "detail": str(exc)},
        )
        return

    final_text = "".join(accumulated)
    await _finalize_assistant(assistant_id, final_text, MessageStatusEnum.COMPLETED)
    yield _sse_event(
        "done",
        {
            "message_id": str(assistant_id),
            "status": "completed",
            "final_length": len(final_text),
        },
    )


async def _finalize_assistant(  # idor-ok: private — updates the bot's own message row, no user-data cross-access
    message_id: uuid.UUID,
    final_text: str,
    status: MessageStatusEnum,
) -> None:
    """Update the streaming row in a fresh, short-lived session.

    (B7 review P2-5 — does not borrow the request-scoped session.)
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Message).where(Message.id == message_id))
        msg = result.scalar_one_or_none()
        if msg is None:
            return
        msg.content = final_text
        msg.status = status.value
        msg.edited_at = datetime.datetime.now(datetime.timezone.utc)
        await session.flush()
        await session.commit()

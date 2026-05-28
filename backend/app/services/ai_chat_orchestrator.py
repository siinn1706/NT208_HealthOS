"""Orchestrates AI replies for messages sent to AI conversations.

End-to-end flow:

  1. WS handler persists the user message and calls
     ``schedule_ai_reply(...)`` (fire-and-forget background task).
  2. The background task opens its OWN async session (request-scoped
     session is gone by the time it runs), loads recent message history,
     builds a ``ChatRequest`` and POSTs to the AI worker
     (``settings.ai_worker_url + /api/ai/chat``).
  3. The reply is persisted via ``chat.send_message`` with the AI bot as
     the ``sender_id`` and broadcast to the conversation room.
  4. On any failure, a synthetic system-content message is persisted so
     the user sees a graceful fallback instead of a silent timeout.

Phase 4 will introduce the streaming variant on top of the same primitives.
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from typing import Any, Awaitable, Callable

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.database import AsyncSessionLocal
from app.core.config import settings
from app.models.core import (
    ConversationTypeEnum,
    Message,
    MessageContentTypeEnum,
    User,
)
from app.schemas.chat import MessageDTO
from app.services import ai_bot, chat as chat_svc

_LOGGER = logging.getLogger("healthos.ai_chat")


# ── Per-user AI rate limiter (separate from the chat-wide 5/s limiter) ──────
class _AiRateLimiter:
    """Sliding-window per-user limiter capped at ``ai_chat_user_rate_per_minute``.

    A list of UTC timestamps is kept per user; old entries are pruned on each
    check so memory stays bounded by the rate cap.
    """

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}

    def allow(self, user_id: str, *, max_per_minute: int) -> bool:
        import time as _time
        now = _time.monotonic()
        window_start = now - 60.0
        bucket = [t for t in self._hits.get(user_id, []) if t >= window_start]
        if len(bucket) >= max_per_minute:
            self._hits[user_id] = bucket
            return False
        bucket.append(now)
        self._hits[user_id] = bucket
        return True


_ai_rate_limiter = _AiRateLimiter()


def get_rate_limiter() -> _AiRateLimiter:
    return _ai_rate_limiter


# ── Concurrency guard: at most N in-flight AI requests per user ─────────────
class _ConcurrencyGuard:
    """In-process semaphore-by-key used to honour ``ai_chat_max_concurrent_per_user``.

    The dict is intentionally process-local; with a single Core BE worker
    (the current student deployment) this is enough. A multi-worker setup
    should swap this for a Redis-backed lock, but the public API stays
    identical so nothing else changes.
    """

    def __init__(self) -> None:
        self._counts: dict[str, int] = {}
        self._lock = asyncio.Lock()

    async def try_acquire(self, key: str, limit: int) -> bool:
        async with self._lock:
            current = self._counts.get(key, 0)
            if current >= limit:
                return False
            self._counts[key] = current + 1
            return True

    async def release(self, key: str) -> None:
        async with self._lock:
            current = self._counts.get(key, 0)
            if current <= 1:
                self._counts.pop(key, None)
            else:
                self._counts[key] = current - 1

    def in_flight(self, key: str) -> int:
        return self._counts.get(key, 0)


_concurrency_guard = _ConcurrencyGuard()


def get_concurrency_guard() -> _ConcurrencyGuard:
    return _concurrency_guard


# ── Public types ────────────────────────────────────────────────────────────

# Caller supplies a coroutine that broadcasts a payload + event_type to all
# WS clients in the conversation room. Decoupling the WS layer keeps this
# module pure (and unit-testable without spinning up FastAPI).
BroadcastFn = Callable[[str, dict[str, Any], str], Awaitable[None]]


class AiBusyError(RuntimeError):
    """Raised when a user already has an in-flight AI request."""


# ── Helpers ─────────────────────────────────────────────────────────────────

async def _fetch_user_with_profile(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def _load_recent_history(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    bot_id: uuid.UUID,
    limit: int,
) -> list[dict[str, str]]:
    """Pull the last ``limit`` messages, oldest-first, mapped to ``ChatTurn`` dicts."""
    result = await db.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.deleted_at.is_(None),
            Message.is_recalled.is_(False),
            Message.content_type == MessageContentTypeEnum.TEXT,
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = list(result.scalars().all())
    rows.reverse()
    history: list[dict[str, str]] = []
    for msg in rows:
        if not msg.content:
            continue
        if msg.sender_id == bot_id:
            role = "assistant"
        elif msg.sender_id == user_id:
            role = "user"
        else:
            continue
        history.append({"role": role, "content": msg.content})
    return history


async def _build_chat_request_payload(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    bot_id: uuid.UUID,
) -> dict[str, Any]:
    """Build the JSON body POSTed to the AI worker.

    Phase 3 plugs the real health context here; for now we keep a sane
    default system prompt so Phase 2 alone gives a working end-to-end demo.
    """
    history = await _load_recent_history(
        db, conversation_id, user_id, bot_id, limit=settings.ai_context_max_messages
    )
    user = await _fetch_user_with_profile(db, user_id)
    locale = "vi"
    if user and user.profile and getattr(user.profile, "preferred_language", None):
        locale = user.profile.preferred_language  # type: ignore[assignment]

    # Phase 3 will overwrite system_prompt + user_context with rich health data.
    try:
        from app.services.ai_chat_context import (
            build_system_prompt,
            build_user_context,
        )
        system_prompt = await build_system_prompt(locale)
        user_context = await build_user_context(db, user) if user else None
    except Exception:  # pragma: no cover - context module is optional in P2
        system_prompt = (
            "Bạn là HealthOS AI Assistant — trợ lý sức khoẻ thân thiện, trả lời đầy đủ "
            "nhưng dễ đọc và dựa trên bằng chứng. Suy xét đủ bối cảnh nhưng không tiết lộ "
            "chuỗi suy luận nội bộ. Khuyến khích người dùng gặp bác sĩ khi triệu chứng "
            "nghiêm trọng. Không đưa chẩn đoán chính thức."
        )
        user_context = None

    return {
        "messages": history,
        "system_prompt": system_prompt,
        "user_context": user_context,
        "max_tokens": settings.ai_chat_reply_max_tokens,
        "locale": locale,
    }


async def _persist_system_fallback(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    bot_id: uuid.UUID,
    text: str,
) -> MessageDTO:
    msg_dto = await chat_svc.send_message(
        db,
        conversation_id=conversation_id,
        sender_id=bot_id,
        content=text,
        content_type="system",
    )
    return msg_dto


async def _post_to_worker(payload: dict[str, Any]) -> dict[str, Any]:
    """POST to the worker's ``/api/ai/chat`` endpoint, returning the JSON body."""
    url = f"{settings.ai_worker_url.rstrip('/')}/api/ai/chat"
    timeout = httpx.Timeout(settings.ai_worker_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def _stream_from_worker(payload: dict[str, Any]):
    """Async generator yielding ``(delta, final)`` tuples from the worker SSE.

    Each event from the worker is a single line ``data: {...}\\n\\n``. The
    final event has ``finish: true`` and carries usage / model / latency.
    """
    import json as _json

    url = f"{settings.ai_worker_url.rstrip('/')}/api/ai/chat/stream"
    timeout = httpx.Timeout(settings.ai_worker_timeout_seconds, read=None)
    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            async for raw_line in response.aiter_lines():
                if not raw_line or not raw_line.startswith("data:"):
                    continue
                payload_str = raw_line[len("data:"):].strip()
                if not payload_str:
                    continue
                try:
                    event = _json.loads(payload_str)
                except _json.JSONDecodeError:
                    continue
                if event.get("finish"):
                    yield ("", event)
                else:
                    yield (event.get("delta", ""), None)


# ── Public entrypoint ──────────────────────────────────────────────────────

async def trigger_ai_reply(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    user_id_str: str,
    broadcast: BroadcastFn,
    typing_broadcast: Callable[[bool], Awaitable[None]] | None = None,
    use_streaming: bool | None = None,
) -> MessageDTO | None:
    """Run one full AI reply round in a fresh DB session.

    Designed to be ``asyncio.create_task``-ed from the WS handler. Exceptions
    are caught and translated into a system-content message so the FE never
    sees a silent stall.

    When ``use_streaming`` is True (default = ``settings.ai_chat_streaming_enabled``)
    the worker's SSE endpoint is used and ``broadcast`` is invoked with the
    extra event names ``ai:started``, ``ai:chunk``, ``ai:completed`` so the
    FE can render the reply incrementally.

    Returns the final broadcast ``MessageDTO`` on success, or ``None`` if the
    concurrency guard rejected the request.
    """
    if use_streaming is None:
        use_streaming = settings.ai_chat_streaming_enabled

    if not await _concurrency_guard.try_acquire(
        user_id_str, settings.ai_chat_max_concurrent_per_user
    ):
        raise AiBusyError("ai_busy")

    if typing_broadcast is not None:
        await typing_broadcast(True)

    try:
        async with AsyncSessionLocal() as db:
            try:
                bot_id = await ai_bot.ensure_ai_bot_member(db, conversation_id)
                await db.commit()
            except RuntimeError as exc:
                _LOGGER.error("ai_bot_missing reason=%s", exc)
                await _emit_system_message(
                    db,
                    conversation_id,
                    user_id,
                    broadcast,
                    "Trợ lý AI chưa sẵn sàng. Quản trị viên cần chạy migration AI bot.",
                )
                return None

            payload = await _build_chat_request_payload(
                db, conversation_id, user_id, bot_id
            )

        if use_streaming:
            return await _run_streaming(
                conversation_id=conversation_id,
                user_id=user_id,
                bot_id=bot_id,
                payload=payload,
                broadcast=broadcast,
            )

        # Worker call lives outside the DB transaction to avoid holding a
        # connection during the (potentially) multi-second LLM round-trip.
        try:
            worker_response = await _post_to_worker(payload)
            reply_text = (worker_response.get("reply") or "").strip()
            if not reply_text:
                raise RuntimeError("worker returned empty reply")
        except httpx.HTTPStatusError as exc:
            detail = _extract_worker_error(exc)
            return await _persist_and_broadcast_system_fallback(
                conversation_id, user_id, broadcast, _format_worker_error_message(detail)
            )
        except (httpx.RequestError, asyncio.TimeoutError, RuntimeError) as exc:
            _LOGGER.warning("ai_worker_call_failed reason=%s", exc)
            return await _persist_and_broadcast_system_fallback(
                conversation_id,
                user_id,
                broadcast,
                "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau.",
            )

        usage_meta = worker_response.get("usage") or {}
        ai_metadata = {
            "model": worker_response.get("model"),
            "prompt_tokens": usage_meta.get("prompt_tokens"),
            "completion_tokens": usage_meta.get("completion_tokens"),
            "total_tokens": usage_meta.get("total_tokens"),
            "latency_ms": worker_response.get("latency_ms"),
            "finish_reason": worker_response.get("finish_reason"),
            "safety_blocked": bool(worker_response.get("safety_blocked")),
            "streamed": False,
        }

        # Persist + broadcast in a fresh session so the worker call's wall-time
        # doesn't keep a transaction open.
        async with AsyncSessionLocal() as db:
            msg_dto = await chat_svc.send_message(
                db,
                conversation_id=conversation_id,
                sender_id=bot_id,
                content=reply_text,
                content_type="text",
            )
            # Inline metadata UPDATE (chat_svc.send_message doesn't accept it).
            from sqlalchemy import update
            from app.models.core import Message
            await db.execute(
                update(Message)
                .where(Message.id == msg_dto.id)
                .values(ai_metadata=ai_metadata)
            )
            await db.commit()
            await broadcast(
                f"conv:{conversation_id}",
                msg_dto.model_dump(mode="json"),
                "msg:new",
            )
            _LOGGER.info(
                "ai.chat.completed user=%s conv=%s model=%s latency_ms=%s "
                "prompt_tokens=%s completion_tokens=%s finish=%s safety_blocked=%s",
                user_id,
                conversation_id,
                ai_metadata.get("model"),
                ai_metadata.get("latency_ms"),
                ai_metadata.get("prompt_tokens"),
                ai_metadata.get("completion_tokens"),
                ai_metadata.get("finish_reason"),
                ai_metadata.get("safety_blocked"),
            )
            return msg_dto
    finally:
        if typing_broadcast is not None:
            try:
                await typing_broadcast(False)
            except Exception:  # noqa: BLE001 - best effort
                pass
        await _concurrency_guard.release(user_id_str)


async def _run_streaming(
    *,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    bot_id: uuid.UUID,
    payload: dict[str, Any],
    broadcast: BroadcastFn,
) -> MessageDTO | None:
    """Streaming variant: persist a placeholder Message immediately, then
    update it as the worker streams deltas.

    Lifecycle of broadcast events:
        ai:started   -> { message_id, conversation_id, sender_id }
        ai:chunk     -> { message_id, conversation_id, delta }
        ai:completed -> full MessageDTO payload (so FE state matches non-stream path)
    """
    room = f"conv:{conversation_id}"

    # Persist placeholder so refreshing mid-stream still loads a row.
    async with AsyncSessionLocal() as db:
        placeholder = await chat_svc.send_message(
            db,
            conversation_id=conversation_id,
            sender_id=bot_id,
            content="",
            content_type="text",
        )
        await db.commit()
    placeholder_id = placeholder.id

    await broadcast(
        room,
        {
            "message_id": str(placeholder_id),
            "conversation_id": str(conversation_id),
            "sender_id": str(bot_id),
        },
        "ai:started",
    )

    accumulated: list[str] = []
    final_meta: dict[str, Any] | None = None
    error_text: str | None = None
    try:
        async for delta, final in _stream_from_worker(payload):
            if final is not None:
                final_meta = final
                if final.get("safety_blocked"):
                    error_text = "Tôi không thể trả lời câu hỏi này. Vui lòng diễn đạt lại."
                elif final.get("error_code") == "AI_UNCONFIGURED":
                    error_text = "Trợ lý AI chưa được cấu hình proxy. Vui lòng liên hệ quản trị viên."
                elif final.get("finish_reason") == "error":
                    error_text = "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau."
                break
            if not delta:
                continue
            accumulated.append(delta)
            await broadcast(
                room,
                {
                    "message_id": str(placeholder_id),
                    "conversation_id": str(conversation_id),
                    "delta": delta,
                },
                "ai:chunk",
            )
    except (httpx.RequestError, httpx.HTTPStatusError, asyncio.TimeoutError) as exc:
        _LOGGER.warning("ai_stream_failed reason=%s", exc)
        error_text = "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau."

    full_text = "".join(accumulated).strip()
    if error_text:
        full_text = error_text
        content_type = "system"
    elif not full_text:
        full_text = "Trợ lý AI không trả lại nội dung. Vui lòng thử lại."
        content_type = "system"
    else:
        content_type = "text"

    # Build the ai_metadata payload from the worker's final event so downstream
    # cost-tracking and debugging tools (Phase 6 reports) have structured data.
    ai_metadata: dict[str, Any] = {}
    if final_meta:
        usage = final_meta.get("usage") or {}
        ai_metadata = {
            "model": final_meta.get("model"),
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
            "latency_ms": final_meta.get("latency_ms"),
            "finish_reason": final_meta.get("finish_reason"),
            "safety_blocked": bool(final_meta.get("safety_blocked")),
            "streamed": True,
        }

    # Final UPDATE in a fresh session.
    async with AsyncSessionLocal() as db:
        from sqlalchemy import update
        from app.models.core import Message, MessageContentTypeEnum
        await db.execute(
            update(Message)
            .where(Message.id == placeholder_id)
            .values(
                content=full_text,
                content_type=MessageContentTypeEnum(content_type),
                edited_at=datetime.datetime.now(datetime.timezone.utc),
                ai_metadata=ai_metadata or None,
            )
        )
        await db.commit()

        msg_dto = await chat_svc._load_message_dto(db, placeholder_id, conversation_id)

    payload_data = msg_dto.model_dump(mode="json")
    await broadcast(room, payload_data, "ai:completed")

    _LOGGER.info(
        "ai.chat.completed user=%s conv=%s model=%s latency_ms=%s "
        "prompt_tokens=%s completion_tokens=%s finish=%s safety_blocked=%s",
        user_id,
        conversation_id,
        ai_metadata.get("model"),
        ai_metadata.get("latency_ms"),
        ai_metadata.get("prompt_tokens"),
        ai_metadata.get("completion_tokens"),
        ai_metadata.get("finish_reason"),
        ai_metadata.get("safety_blocked"),
    )
    return msg_dto


async def _emit_system_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    broadcast: BroadcastFn,
    text: str,
) -> MessageDTO:
    """Use the user as the synthetic sender (no bot row yet) so the message
    persists even when the migration was skipped. Marked as ``system``
    content_type so the FE renders it differently.
    """
    msg_dto = await chat_svc.send_message(
        db,
        conversation_id=conversation_id,
        sender_id=user_id,
        content=text,
        content_type="system",
    )
    await db.commit()
    await broadcast(
        f"conv:{conversation_id}",
        msg_dto.model_dump(mode="json"),
        "msg:new",
    )
    return msg_dto


async def _persist_and_broadcast_system_fallback(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    broadcast: BroadcastFn,
    text: str,
) -> MessageDTO:
    async with AsyncSessionLocal() as db:
        bot_id_or_user = user_id
        try:
            bot_id_or_user = await ai_bot.get_ai_bot_user_id(db)
        except RuntimeError:
            pass
        msg_dto = await chat_svc.send_message(
            db,
            conversation_id=conversation_id,
            sender_id=bot_id_or_user,
            content=text,
            content_type="system",
        )
        await db.commit()
        await broadcast(
            f"conv:{conversation_id}",
            msg_dto.model_dump(mode="json"),
            "msg:new",
        )
        return msg_dto


def _extract_worker_error(exc: httpx.HTTPStatusError) -> dict[str, Any]:
    try:
        body = exc.response.json()
    except Exception:  # noqa: BLE001
        return {"code": f"HTTP_{exc.response.status_code}", "message": exc.response.text[:200]}
    detail = body.get("detail") if isinstance(body, dict) else None
    if isinstance(detail, dict):
        return detail
    return {"code": f"HTTP_{exc.response.status_code}", "message": str(detail or body)[:200]}


def _format_worker_error_message(detail: dict[str, Any]) -> str:
    code = detail.get("code", "AI_ERROR")
    if code == "AI_UNCONFIGURED":
        return "Trợ lý AI chưa được cấu hình proxy. Vui lòng liên hệ quản trị viên."
    if code == "AI_TIMEOUT":
        return "Trợ lý AI phản hồi quá lâu. Vui lòng thử lại."
    if code == "AI_SAFETY_BLOCKED":
        return "Tôi không thể trả lời câu hỏi này. Vui lòng diễn đạt lại."
    return "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau."


# ── Test seam ───────────────────────────────────────────────────────────────

async def _send_message_for_tests(  # pragma: no cover - re-export
    db: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    sender_id: uuid.UUID,
    content: str,
    content_type: str = "text",
) -> MessageDTO:
    return await chat_svc.send_message(
        db,
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        content_type=content_type,
    )

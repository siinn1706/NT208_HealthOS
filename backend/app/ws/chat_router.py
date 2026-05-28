"""WebSocket event dispatcher for chat events.

All client-sent chat events are handled here, keeping main.py clean.

Protocol (client → server):
  { "event": "<type>", "payload": { ... } }

Supported event types:
  client:hello   → server:hello (handshake)
  conv:join      → join a conversation room (membership verified)
    msg:send / chat.message.send      → persist + broadcast msg:new + chat.message.sent
    msg:edit / chat.message.edit      → persist + broadcast msg:edit + chat.message.edited
    msg:delete / chat.message.recall  → soft-delete + broadcast msg:delete + chat.message.recalled
    msg:react / chat.message.react    → toggle reaction + broadcast msg:react + chat.message.reacted
  msg:pin        → pin + broadcast msg:pinned
  msg:unpin      → unpin + broadcast msg:unpinned
    msg:read / chat.message.read      → mark read + broadcast msg:read + chat.message.read
    typing / chat.typing              → broadcast typing indicator (exclude sender)
  conv:sync      → delta sync messages since cursor
  pong           → heartbeat reply (no-op)

Event Envelope (canonical format):
  {
    "event": "event.type",
    "version": "1.0",
    "payload": {...},
    "metadata": {
      "event_id": "uuid",
      "timestamp": "ISO8601",
      "user_id": "uuid",
      "correlation_id": "uuid"
    }
  }
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from typing import Any, Callable

from fastapi import WebSocket
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal
from app.models.core import Conversation, ConversationMember, ConversationTypeEnum
from app.services import ai_chat_orchestrator, chat as chat_svc
from app.services.events import EventEmitter
from app.ws.handlers import ConnectionManager

event_emitter = EventEmitter()
_LOGGER = logging.getLogger("healthos.ws.chat")


async def handle_ws_event(
    ws: WebSocket,
    user_id: uuid.UUID,
    user_id_str: str,
    event_type: str,
    payload: dict[str, Any],
    db: AsyncSession,
    manager: ConnectionManager,
    ts_now: Callable[[], str],
) -> None:
    """Route an incoming WS event to the correct handler."""

    async def ack_error(code: str, message: str) -> None:
        await manager.send_to_ws(ws, {
            "event": "error",
            "payload": {"code": code, "message": message},
            "timestamp": ts_now(),
        })

    if not isinstance(payload, dict):
        await ack_error("INVALID_FRAME", "Frame payload must be a JSON object.")
        return

    def chat_service_error_code(exc: Exception) -> str:
        message = str(exc).lower()
        if isinstance(exc, PermissionError) or "not a member" in message:
            return "CHAT_FORBIDDEN"
        return "CHAT_ERROR"

    async def broadcast_dual(
        room: str,
        payload_data: dict[str, Any],
        legacy_event: str,
        contract_event: str,
        *,
        exclude: WebSocket | None = None,
    ) -> None:
        legacy_msg = {"event": legacy_event, "payload": payload_data, "timestamp": ts_now()}
        await manager.broadcast(room, legacy_msg, exclude_ws=exclude)
        canonical_msg = event_emitter.emit_to_ws(contract_event, payload_data, user_id)
        await manager.broadcast(room, canonical_msg, exclude_ws=exclude)

    async def fanout_to_members(
        conversation_id: uuid.UUID,
        event: str,
        payload_data: dict[str, Any],
    ) -> None:
        """Per-user fanout for members not joined to the room."""
        try:
            result = await db.execute(
                select(ConversationMember.user_id).where(
                    and_(
                        ConversationMember.conversation_id == conversation_id,
                        ConversationMember.is_accepted.is_(True),
                    )
                )
            )
            member_ids = [uid for uid in result.scalars().all() if uid != user_id]
            frame = {"event": event, "payload": payload_data, "timestamp": ts_now()}
            await asyncio.gather(*[manager.send_to_user(str(uid), frame) for uid in member_ids])
        except Exception:
            pass  # Fanout failure must not fail the WS handler

    # ── Handshake ─────────────────────────────────────────────────────────────
    if event_type == "client:hello":
        await manager.send_to_ws(ws, {
            "event": "server:hello",
            "payload": {
                "serverTime": ts_now(),
                "heartbeatIntervalMs": ConnectionManager.HEARTBEAT_INTERVAL * 1000,
                "userId": user_id_str,
            },
            "timestamp": ts_now(),
        })

    # ── Pong (heartbeat reply) ─────────────────────────────────────────────────
    elif event_type == "pong":
        manager.record_pong(ws)

    # ── Join conversation room ─────────────────────────────────────────────────
    elif event_type == "conv:join":
        conv_id_str = payload.get("conversation_id", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "conv:join requires a valid conversation_id UUID.")
            return

        # Verify membership
        try:
            await chat_svc.assert_member(db, conv_id, user_id)
        except ValueError:
            await ack_error("CHAT_FORBIDDEN", "You are not a member of this conversation.")
            return

        room = f"conv:{conv_id}"
        manager.join_room(ws, room)
        await manager.send_to_ws(ws, {
            "event": "conv:joined",
            "payload": {"conversation_id": conv_id_str},
            "timestamp": ts_now(),
        })

        # Broadcast online status to this room
        presence = manager.get_presence(user_id_str)
        await manager.broadcast(room, {
            "event": "user.status",
            "payload": {
                "user_id": user_id_str,
                "is_online": True,
                "last_seen_at": presence.get("last_seen_at"),
            },
            "timestamp": ts_now(),
        }, exclude_ws=ws)

    # ── Send message ───────────────────────────────────────────────────────────
    elif event_type in {"msg:send", "chat.message.send"}:
        if not manager.check_rate_limit(user_id_str):
            await ack_error("RATE_LIMITED", "You are sending messages too fast.")
            return

        conv_id_str = payload.get("conversation_id", "")
        content = payload.get("content", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:send requires a valid conversation_id UUID.")
            return

        if not content:
            await ack_error("INVALID_PAYLOAD", "content cannot be empty.")
            return

        client_message_id = payload.get("client_message_id")
        reply_to_id_str = payload.get("reply_to_id")
        try:
            reply_to_id = uuid.UUID(str(reply_to_id_str)) if reply_to_id_str else None
        except (ValueError, TypeError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "reply_to_id must be a valid UUID.")
            return
        content_type = payload.get("content_type", "text")

        try:
            msg_dto = await chat_svc.send_message(
                db,
                conversation_id=conv_id,
                sender_id=user_id,
                content=content,
                content_type=content_type,
                client_message_id=client_message_id,
                reply_to_id=reply_to_id,
            )
        except (ValueError, PermissionError) as exc:
            await ack_error(chat_service_error_code(exc), str(exc))
            return

        await db.commit()
        msg_data = msg_dto.model_dump(mode="json")

        # ACK to sender
        await manager.send_to_ws(ws, {
            "event": "msg:ack",
            "payload": {
                "client_message_id": client_message_id,
                "server_message_id": str(msg_dto.id),
                "created_at": msg_dto.created_at.isoformat(),
            },
            "timestamp": ts_now(),
        })

        # Broadcast to room (excluding sender's socket — they already got ack)
        room = f"conv:{conv_id}"
        await broadcast_dual(room, msg_data, "msg:new", "chat.message.sent", exclude=ws)
        await fanout_to_members(conv_id, "chat.message.sent", msg_data)

        # ── AI conversation: kick off Gemini reply in the background ────────
        await _maybe_trigger_ai_reply(
            db=db,
            ws=ws,
            conversation_id=conv_id,
            user_id=user_id,
            user_id_str=user_id_str,
            user_message_content=content,
            manager=manager,
            ts_now=ts_now,
        )

    # ── Edit message ───────────────────────────────────────────────────────────
    elif event_type in {"msg:edit", "chat.message.edit"}:
        if not manager.check_rate_limit(user_id_str):
            await ack_error("RATE_LIMITED", "You are sending messages too fast.")
            return
        conv_id_str = payload.get("conversation_id", "")
        msg_id_str = payload.get("message_id", "")
        content = payload.get("content", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            msg_id = uuid.UUID(msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:edit requires valid conversation_id and message_id UUIDs.")
            return

        try:
            msg_dto = await chat_svc.edit_message(db, msg_id, conv_id, user_id, content)
        except PermissionError as exc:
            await ack_error("CHAT_FORBIDDEN", str(exc))
            return
        except ValueError as exc:
            await ack_error("CHAT_ERROR", str(exc))
            return

        await db.commit()
        payload_data = msg_dto.model_dump(mode="json")
        event_data = {"event": "msg:edit", "payload": payload_data, "timestamp": ts_now()}
        await manager.send_to_ws(ws, {**event_data, "event": "msg:edit:ack"})
        await broadcast_dual(f"conv:{conv_id}", payload_data, "msg:edit", "chat.message.edited", exclude=ws)
        await fanout_to_members(conv_id, "chat.message.edited", payload_data)

    # ── Delete / recall message ────────────────────────────────────────────────
    elif event_type in {"msg:delete", "chat.message.recall"}:
        if not manager.check_rate_limit(user_id_str):
            await ack_error("RATE_LIMITED", "You are sending messages too fast.")
            return
        conv_id_str = payload.get("conversation_id", "")
        msg_id_str = payload.get("message_id", "")
        delete_for_everyone = bool(payload.get("delete_for_everyone", True))
        try:
            conv_id = uuid.UUID(conv_id_str)
            msg_id = uuid.UUID(msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:delete requires valid UUIDs.")
            return

        try:
            msg_dto = await chat_svc.recall_message(db, msg_id, conv_id, user_id, delete_for_everyone)
        except PermissionError as exc:
            await ack_error("CHAT_FORBIDDEN", str(exc))
            return
        except ValueError as exc:
            await ack_error("CHAT_ERROR", str(exc))
            return

        await db.commit()
        payload_data = msg_dto.model_dump(mode="json")
        event_data = {"event": "msg:delete", "payload": payload_data, "timestamp": ts_now()}
        await manager.send_to_ws(ws, {**event_data, "event": "msg:delete:ack"})
        await broadcast_dual(f"conv:{conv_id}", payload_data, "msg:delete", "chat.message.recalled", exclude=ws)
        await fanout_to_members(conv_id, "chat.message.recalled", payload_data)

    # ── React to message ───────────────────────────────────────────────────────
    elif event_type in {"msg:react", "chat.message.react"}:
        conv_id_str = payload.get("conversation_id", "")
        msg_id_str = payload.get("message_id", "")
        emoji = payload.get("emoji", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            msg_id = uuid.UUID(msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:react requires valid UUIDs.")
            return
        if not emoji:
            await ack_error("INVALID_PAYLOAD", "emoji is required.")
            return
        # Validate emoji length using grapheme clusters to correctly handle
        # multi-codepoint emoji sequences (e.g. skin-tone modifiers, ZWJ sequences).
        # The WsReactMessage schema allows max_length=64 bytes; mirror that here.
        if len(emoji.encode("utf-8")) > 64:
            await ack_error("INVALID_PAYLOAD", "emoji exceeds maximum allowed length.")
            return

        try:
            msg_dto = await chat_svc.react_to_message(db, msg_id, conv_id, user_id, emoji)
        except (ValueError, PermissionError) as exc:
            await ack_error(chat_service_error_code(exc), str(exc))
            return

        await db.commit()
        payload_data = msg_dto.model_dump(mode="json")
        event_data = {"event": "msg:react", "payload": payload_data, "timestamp": ts_now()}
        await manager.send_to_ws(ws, {**event_data, "event": "msg:react:ack"})
        await broadcast_dual(f"conv:{conv_id}", payload_data, "msg:react", "chat.message.reacted", exclude=ws)

    # ── Pin message ────────────────────────────────────────────────────────────
    elif event_type == "msg:pin":
        conv_id_str = payload.get("conversation_id", "")
        msg_id_str = payload.get("message_id", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            msg_id = uuid.UUID(msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:pin requires valid UUIDs.")
            return

        try:
            await chat_svc.pin_message(db, msg_id, conv_id, user_id)
        except (ValueError, PermissionError) as exc:
            await ack_error(chat_service_error_code(exc), str(exc))
            return

        await db.commit()
        pin_payload = {"conversation_id": conv_id_str, "message_id": msg_id_str}
        await manager.send_to_ws(ws, {"event": "msg:pin:ack", "payload": pin_payload, "timestamp": ts_now()})
        await broadcast_dual(f"conv:{conv_id}", pin_payload, "msg:pinned", "chat.message.pinned", exclude=ws)

    # ── Unpin message ──────────────────────────────────────────────────────────
    elif event_type == "msg:unpin":
        conv_id_str = payload.get("conversation_id", "")
        msg_id_str = payload.get("message_id", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            msg_id = uuid.UUID(msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:unpin requires valid UUIDs.")
            return

        try:
            await chat_svc.unpin_message(db, msg_id, conv_id, user_id)
        except (ValueError, PermissionError) as exc:
            await ack_error(chat_service_error_code(exc), str(exc))
            return

        await db.commit()
        unpin_payload = {"conversation_id": conv_id_str, "message_id": msg_id_str}
        await manager.send_to_ws(ws, {"event": "msg:unpin:ack", "payload": unpin_payload, "timestamp": ts_now()})
        await broadcast_dual(f"conv:{conv_id}", unpin_payload, "msg:unpinned", "chat.message.unpinned", exclude=ws)

    # ── Mark as read ───────────────────────────────────────────────────────────
    elif event_type in {"msg:read", "chat.message.read"}:
        conv_id_str = payload.get("conversation_id", "")
        last_msg_id_str = payload.get("last_read_message_id") or payload.get("last_message_id", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            last_msg_id = uuid.UUID(last_msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:read requires valid UUIDs.")
            return

        try:
            await chat_svc.mark_conversation_read(db, conv_id, user_id, last_msg_id)
        except ValueError:
            await ack_error("CHAT_FORBIDDEN", "You are not a member of this conversation.")
            return
        await db.commit()

        read_payload = {
            "user_id": user_id_str,
            "conversation_id": conv_id_str,
            "last_read_message_id": last_msg_id_str,
        }
        # Broadcast to the whole room so senders see read receipt
        await broadcast_dual(f"conv:{conv_id}", read_payload, "msg:read", "chat.message.read")

    # ── Typing indicator ───────────────────────────────────────────────────────
    elif event_type in {"typing", "chat.typing"}:
        if not manager.check_rate_limit(user_id_str):
            await ack_error("RATE_LIMITED", "You are sending typing events too fast.")
            return
        conv_id_str = payload.get("conversation_id", "")
        is_typing = bool(payload.get("is_typing", True))
        try:
            conv_id = uuid.UUID(conv_id_str)
        except (ValueError, AttributeError):
            return  # silently ignore malformed typing events

        try:
            await chat_svc.assert_member(db, conv_id, user_id)
        except ValueError:
            await ack_error("CHAT_FORBIDDEN", "You are not a member of this conversation.")
            return

        typing_payload = {
            "user_id": user_id_str,
            "conversation_id": conv_id_str,
            "is_typing": is_typing,
        }
        await broadcast_dual(f"conv:{conv_id}", typing_payload, "typing", "chat.typing", exclude=ws)

    # ── Delta sync ─────────────────────────────────────────────────────────────
    elif event_type == "conv:sync":
        conv_id_str = payload.get("conversation_id", "")
        after_msg_id_str = payload.get("after_message_id")
        try:
            limit = int(payload.get("limit", 50))
        except (TypeError, ValueError):
            await ack_error("INVALID_PAYLOAD", "conv:sync limit must be an integer.")
            return
        limit = max(1, min(limit, 100))

        try:
            conv_id = uuid.UUID(conv_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "conv:sync requires valid conversation_id.")
            return

        # Determine cursor: fetch messages after this timestamp
        before_ts = None
        if after_msg_id_str:
            try:
                after_msg_id = uuid.UUID(after_msg_id_str)
                from sqlalchemy import select
                from app.models.core import Message
                ts_result = await db.execute(
                    select(Message.created_at).where(Message.id == after_msg_id)
                )
                before_ts = ts_result.scalar_one_or_none()
            except Exception:
                pass

        try:
            msgs, has_more = await chat_svc.get_messages(
                db, conv_id, user_id, before=before_ts, limit=limit
            )
        except ValueError as exc:
            await ack_error("CHAT_FORBIDDEN", str(exc))
            return

        await manager.send_to_ws(ws, {
            "event": "conv:sync:result",
            "payload": {
                "conversation_id": conv_id_str,
                "messages": [m.model_dump(mode="json") for m in msgs],
                "has_more": has_more,
            },
            "timestamp": ts_now(),
        })

    else:
        await ack_error("UNKNOWN_EVENT", f"Unknown event type: '{event_type}'")


# ── AI conversation hook ─────────────────────────────────────────────────────

async def _maybe_trigger_ai_reply(
    *,
    db: AsyncSession,
    ws: WebSocket,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    user_id_str: str,
    user_message_content: str,
    manager: ConnectionManager,
    ts_now: Callable[[], str],
) -> None:
    """Spawn a background task to fetch + broadcast an AI reply when the
    just-persisted user message belongs to an AI conversation.

    The orchestrator runs in its own ``AsyncSessionLocal`` because the WS
    request session is short-lived. We use ``asyncio.create_task`` so the
    user's ``msg:ack`` is not delayed by the LLM round-trip.
    """
    if not user_message_content.strip():
        return

    type_result = await db.execute(
        select(Conversation.type).where(Conversation.id == conversation_id)
    )
    conv_type = type_result.scalar_one_or_none()
    if conv_type != ConversationTypeEnum.AI:
        return

    from app.core.config import settings as _settings
    if len(user_message_content) > _settings.ai_chat_max_user_message_chars:
        await manager.send_to_ws(ws, {
            "event": "error",
            "payload": {
                "code": "AI_MESSAGE_TOO_LONG",
                "message": (
                    f"Tin nhắn AI tối đa {_settings.ai_chat_max_user_message_chars} ký tự."
                ),
            },
            "timestamp": ts_now(),
        })
        return

    # Per-user AI rate limit (separate from the chat-wide 5/s token bucket).
    if not ai_chat_orchestrator.get_rate_limiter().allow(
        user_id_str, max_per_minute=_settings.ai_chat_user_rate_per_minute
    ):
        await manager.send_to_ws(ws, {
            "event": "error",
            "payload": {
                "code": "AI_RATE_LIMITED",
                "message": (
                    f"Bạn nhắn AI quá nhanh. Tối đa "
                    f"{_settings.ai_chat_user_rate_per_minute} tin nhắn/phút."
                ),
            },
            "timestamp": ts_now(),
        })
        return

    room = f"conv:{conversation_id}"

    async def broadcast_event(target_room: str, payload: dict[str, Any], event_name: str) -> None:
        legacy = {"event": event_name, "payload": payload, "timestamp": ts_now()}
        await manager.broadcast(target_room, legacy)
        contract_event = {
            "msg:new": "chat.message.sent",
            "msg:edit": "chat.message.edited",
            "ai:started": "chat.message.ai_started",
            "ai:chunk": "chat.message.ai_chunk",
            "ai:completed": "chat.message.ai_completed",
        }.get(event_name)
        if contract_event:
            canonical = event_emitter.emit_to_ws(contract_event, payload, user_id)
            await manager.broadcast(target_room, canonical)

    async def emit_typing(is_typing: bool) -> None:
        # The bot's user_id_str isn't known here — use a sentinel so the FE
        # can pick it up. The real id lives in the persisted message's sender_id.
        from app.services.ai_bot import get_ai_bot_user_id
        try:
            async with AsyncSessionLocal() as inner_db:
                bot_id = await get_ai_bot_user_id(inner_db)
            bot_id_str = str(bot_id)
        except RuntimeError:
            bot_id_str = "ai-bot"
        await manager.broadcast(room, {
            "event": "typing",
            "payload": {
                "user_id": bot_id_str,
                "conversation_id": str(conversation_id),
                "is_typing": is_typing,
            },
            "timestamp": ts_now(),
        })

    async def runner() -> None:
        try:
            await ai_chat_orchestrator.trigger_ai_reply(
                conversation_id=conversation_id,
                user_id=user_id,
                user_id_str=user_id_str,
                broadcast=broadcast_event,
                typing_broadcast=emit_typing,
            )
        except ai_chat_orchestrator.AiBusyError:
            await manager.send_to_ws(ws, {
                "event": "error",
                "payload": {
                    "code": "AI_BUSY",
                    "message": "Trợ lý AI đang trả lời tin nhắn trước. Vui lòng đợi.",
                },
                "timestamp": ts_now(),
            })
        except Exception as exc:  # noqa: BLE001 - background task safety net
            _LOGGER.exception("ai_reply_runner_failed reason=%s", exc)

    asyncio.create_task(runner())

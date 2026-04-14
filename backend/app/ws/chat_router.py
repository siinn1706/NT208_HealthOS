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

import datetime
import uuid
from typing import Any, Callable

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import chat as chat_svc
from app.services.events import EventEmitter
from app.ws.handlers import ConnectionManager

event_emitter = EventEmitter()


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
        reply_to_id = uuid.UUID(reply_to_id_str) if reply_to_id_str else None
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
            await ack_error("CHAT_ERROR", str(exc))
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
        except ValueError as exc:
            await ack_error("CHAT_ERROR", str(exc))
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
        except ValueError as exc:
            await ack_error("CHAT_ERROR", str(exc))
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
        except ValueError as exc:
            await ack_error("CHAT_ERROR", str(exc))
            return

        await db.commit()
        unpin_payload = {"conversation_id": conv_id_str, "message_id": msg_id_str}
        await manager.send_to_ws(ws, {"event": "msg:unpin:ack", "payload": unpin_payload, "timestamp": ts_now()})
        await broadcast_dual(f"conv:{conv_id}", unpin_payload, "msg:unpinned", "chat.message.unpinned", exclude=ws)

    # ── Mark as read ───────────────────────────────────────────────────────────
    elif event_type in {"msg:read", "chat.message.read"}:
        conv_id_str = payload.get("conversation_id", "")
        last_msg_id_str = payload.get("last_read_message_id", "")
        try:
            conv_id = uuid.UUID(conv_id_str)
            last_msg_id = uuid.UUID(last_msg_id_str)
        except (ValueError, AttributeError):
            await ack_error("INVALID_PAYLOAD", "msg:read requires valid UUIDs.")
            return

        await chat_svc.mark_conversation_read(db, conv_id, user_id, last_msg_id)
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
        conv_id_str = payload.get("conversation_id", "")
        is_typing = bool(payload.get("is_typing", True))
        try:
            conv_id = uuid.UUID(conv_id_str)
        except (ValueError, AttributeError):
            return  # silently ignore malformed typing events

        # Broadcast to room but exclude sender
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
        limit = int(payload.get("limit", 50))
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

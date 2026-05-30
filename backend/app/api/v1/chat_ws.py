"""Per-conversation WebSocket endpoint for user-to-user realtime chat.

URL: GET /v1/chat/ws/{conversation_id}?token=<access_token>

Auth: Regular JWT access token (not ws_ticket) — the browser passes it
directly so the user doesn't need a separate ws-token round-trip.

On connect the endpoint:
  1. Decodes and validates the JWT.
  2. Verifies the user is an accepted member of the conversation.
  3. Registers the socket with the shared ConnectionManager and auto-joins
     the ``conv:{conversation_id}`` room — the client does NOT need to send
     a separate ``conv:join`` event.
  4. Broadcasts an online-presence event to the room.

The message loop delegates all event handling to ``handle_ws_event`` from
``app.ws.chat_router`` so the exact same protocol (msg:send, typing,
msg:read, msg:react, msg:delete, msg:edit, …) works here without
duplication.  conversation_id is injected into every payload automatically
if the client omits it.
"""
from __future__ import annotations

import datetime
import json
import logging
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.adapters.database import AsyncSessionLocal
from app.adapters.redis_client import get_redis
from app.core.security import JWT_BLACKLIST_PREFIX, decode_access_token
from app.services import chat as chat_svc
from app.ws.chat_router import handle_ws_event
from app.ws.handlers import manager

router = APIRouter(prefix="/chat", tags=["Chat WS"])
_LOGGER = logging.getLogger("healthos.ws.chat_per_conv")

_WS_MAX_FRAME_BYTES = 65_536


@router.websocket("/ws/{conversation_id}")
async def per_conversation_ws(
    ws: WebSocket,
    conversation_id: uuid.UUID,
    token: str | None = None,
) -> None:
    """
    Per-conversation WebSocket for user-to-user realtime chat.

    Authentication:
      ?token=<JWT access token>  (required; regular access_token accepted)

    The client sends JSON frames:
      { "event": "<type>", "payload": { ... } }

    Supported client event types (same as the global /ws):
      msg:send / chat.message.send  — send a message
      msg:edit / chat.message.edit  — edit own message
      msg:delete / chat.message.recall — recall own message
      msg:react / chat.message.react — toggle reaction
      msg:read / chat.message.read  — mark messages read
      typing / chat.typing          — typing indicator
      msg:pin / msg:unpin           — pin / unpin
      conv:sync                     — delta-sync messages
      pong                          — heartbeat reply

    The conversation_id is injected automatically into all payloads so the
    client may omit it.
    """
    ts_now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()  # noqa: E731

    # ── Auth ──────────────────────────────────────────────────────────────────
    if not token:
        await ws.accept()
        await ws.send_json({
            "event": "error",
            "payload": {"code": "AUTH_REQUIRED", "message": "Missing ?token= query param."},
            "timestamp": ts_now(),
        })
        await ws.close(code=4001)
        return

    try:
        payload = decode_access_token(token)
        jti = payload.get("jti")
        if jti:
            redis_conn = await get_redis()
            revoked = await redis_conn.exists(f"{JWT_BLACKLIST_PREFIX}{jti}")
            if revoked:
                raise JWTError("token has been revoked")
        user_id_str = payload.get("sub", "")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError, TypeError):
        await ws.accept()
        await ws.send_json({
            "event": "error",
            "payload": {"code": "AUTH_INVALID_TOKEN", "message": "Invalid or expired token."},
            "timestamp": ts_now(),
        })
        await ws.close(code=4001)
        return

    # ── Verify conversation membership ────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        try:
            await chat_svc.assert_member(db, conversation_id, user_id)
        except ValueError:
            await ws.accept()
            await ws.send_json({
                "event": "error",
                "payload": {
                    "code": "CHAT_FORBIDDEN",
                    "message": "You are not a member of this conversation.",
                },
                "timestamp": ts_now(),
            })
            await ws.close(code=4003)
            return

    # ── Connect ───────────────────────────────────────────────────────────────
    await manager.connect(ws, user_id_str)
    _LOGGER.info("per_conv_ws connected user=%s conv=%s", user_id_str, conversation_id)

    manager.join_room(ws, f"user:{user_id_str}")
    conv_room = f"conv:{conversation_id}"
    manager.join_room(ws, conv_room)

    await manager.send_to_ws(ws, {
        "event": "conv:joined",
        "payload": {"conversation_id": str(conversation_id)},
        "timestamp": ts_now(),
    })

    # Broadcast online presence to room (excluding this socket)
    presence = manager.get_presence(user_id_str)
    await manager.broadcast(conv_room, {
        "event": "user.status",
        "payload": {
            "user_id": user_id_str,
            "is_online": True,
            "last_seen_at": presence.get("last_seen_at"),
        },
        "timestamp": ts_now(),
    }, exclude_ws=ws)

    # ── Message loop ──────────────────────────────────────────────────────────
    try:
        while True:
            raw = await ws.receive_text()

            if len(raw.encode("utf-8")) > _WS_MAX_FRAME_BYTES:
                await manager.send_to_ws(ws, {
                    "event": "error",
                    "payload": {
                        "code": "FRAME_TOO_LARGE",
                        "message": "Message frame exceeds maximum allowed size.",
                    },
                    "timestamp": ts_now(),
                })
                continue

            try:
                frame = json.loads(raw)
            except (json.JSONDecodeError, ValueError):
                await manager.send_to_ws(ws, {
                    "event": "error",
                    "payload": {"code": "INVALID_JSON", "message": "Could not parse JSON frame."},
                    "timestamp": ts_now(),
                })
                continue

            event_type = frame.get("event", "")
            payload_data: dict = frame.get("payload", {})

            # Heartbeat reply — handled directly, no DB access needed
            if event_type == "pong":
                manager.record_pong(ws)
                continue

            # Inject conversation_id so the client may omit it in payloads
            if "conversation_id" not in payload_data:
                payload_data["conversation_id"] = str(conversation_id)

            async with AsyncSessionLocal() as db:
                await handle_ws_event(
                    ws=ws,
                    user_id=user_id,
                    user_id_str=user_id_str,
                    event_type=event_type,
                    payload=payload_data,
                    db=db,
                    manager=manager,
                    ts_now=ts_now,
                )

    except WebSocketDisconnect:
        disconnected_user = manager.disconnect(ws)
        _LOGGER.info("per_conv_ws disconnected user=%s conv=%s", user_id_str, conversation_id)
        if disconnected_user:
            # disconnect() only flips presence to offline once the user's LAST
            # socket is gone, so read the real value rather than hardcoding
            # False — otherwise closing one of several tabs/devices would
            # broadcast a spurious offline to peers while the user is still on.
            presence = manager.get_presence(disconnected_user)
            await manager.broadcast(conv_room, {
                "event": "user.status",
                "payload": {
                    "user_id": disconnected_user,
                    "is_online": presence.get("is_online", False),
                    "last_seen_at": presence.get("last_seen_at"),
                },
                "timestamp": ts_now(),
            })
    except Exception as exc:
        _LOGGER.exception(
            "per_conv_ws error user=%s conv=%s: %s", user_id_str, conversation_id, exc
        )
        manager.disconnect(ws)

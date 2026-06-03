"""WebSocket post-connect (first-frame) authentication.

Security: clients send the auth ticket as the FIRST frame after the socket
opens, instead of embedding it in the URL query string. URL-embedded tokens
leak into proxy/CDN access logs and browser history; a post-connect frame
stays inside the encrypted TLS tunnel.

Protocol contract (mirrored in frontend src/lib/ws-auth-protocol.ts):
  1. Client connects (no token in URL).
  2. Client sends: {"type": "auth", "ticket": "<ws_ticket>"}
  3. Server validates. Invalid -> close(4401). Timeout -> close(4401).
"""
from __future__ import annotations

import asyncio
import datetime
import json
import logging
import uuid
from typing import Optional

from fastapi import WebSocket
from jose import JWTError

from app.adapters.redis_client import get_redis
from app.core.security import JWT_BLACKLIST_PREFIX, decode_token_with_type

_LOGGER = logging.getLogger("healthos.ws.auth")

AUTH_FRAME_TIMEOUT_SECONDS = 5.0
AUTH_REJECTED_CLOSE_CODE = 4401


def _ts_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


async def authenticate_first_frame(ws: WebSocket) -> Optional[uuid.UUID]:
    """Accept the socket, await {type:"auth",ticket:...}, validate the ticket.

    Returns the authenticated user_id on success.
    Returns None and closes the socket with code 4401 on any failure
    (timeout, malformed frame, invalid/expired/revoked ticket).

    Callers that want a string form can use str(user_id).
    """
    await ws.accept()

    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=AUTH_FRAME_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        await _reject(ws, "AUTH_TIMEOUT", "No auth frame received within timeout.")
        return None
    except Exception:  # noqa: BLE001 - socket may already be closed
        return None

    try:
        frame = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        await _reject(ws, "AUTH_INVALID_FRAME", "First frame must be JSON.")
        return None

    if not isinstance(frame, dict) or frame.get("type") != "auth":
        await _reject(ws, "AUTH_INVALID_FRAME", "First frame must be {type:'auth',ticket:...}.")
        return None

    ticket = frame.get("ticket")
    if not isinstance(ticket, str) or not ticket:
        await _reject(ws, "AUTH_INVALID_FRAME", "Missing ticket in auth frame.")
        return None

    try:
        payload = decode_token_with_type(
            ticket,
            expected_type="ws_ticket",
            allow_legacy_access=False,
        )
        jti = payload.get("jti")
        if jti:
            try:
                redis_conn = await get_redis()
                revoked = await asyncio.wait_for(
                    redis_conn.exists(f"{JWT_BLACKLIST_PREFIX}{jti}"),
                    timeout=1.0,
                )
            except Exception as exc:  # noqa: BLE001
                _LOGGER.warning("WS ticket revocation check unavailable: %s", exc)
                revoked = False
            if revoked:
                raise JWTError("ws_ticket has been revoked")
        user_id = uuid.UUID(payload.get("sub", ""))
    except (JWTError, ValueError, TypeError):
        await _reject(ws, "AUTH_INVALID_TOKEN", "Invalid or expired ticket.")
        return None

    return user_id


async def _reject(ws: WebSocket, code: str, message: str) -> None:
    try:
        await ws.send_json({
            "event": "error",
            "payload": {"code": code, "message": message},
            "timestamp": _ts_now(),
        })
    except Exception:  # noqa: BLE001
        pass
    try:
        await ws.close(code=AUTH_REJECTED_CLOSE_CODE)
    except Exception:  # noqa: BLE001
        pass

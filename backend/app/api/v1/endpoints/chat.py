"""Legacy AI chat WebSocket — REMOVED in plans/ai-chat-completion/plan.md.

The previous ``/ws/chat/{user_id}`` route bridged a raw socket to the
worker's stub ``/api/ai/generate`` endpoint and never persisted messages
into the ``messages`` table. With the new orchestrator the AI replies flow
through the canonical chat WS at ``/ws`` (see ``backend/app/main.py``)
and use the same ``Conversation`` / ``Message`` rows as human chat.

We keep this module so any stale ``include_router(chat_ws_router)`` import
in ``main.py`` continues to resolve, but the router is intentionally empty
— the FE no longer calls this URL.
"""
from __future__ import annotations

import datetime
import logging

from fastapi import APIRouter, WebSocket

router = APIRouter()
_LOGGER = logging.getLogger("healthos.ws.legacy_chat")


@router.websocket("/ws/chat/{user_id}")
async def deprecated_websocket_chat(user_id: str, ws: WebSocket) -> None:  # idor-ok: immediately rejects with 4410 — no resource access
    """Reject connections politely — direct callers to the canonical ``/ws`` route."""
    await ws.accept()
    await ws.send_json({
        "event": "error",
        "payload": {
            "code": "ENDPOINT_DEPRECATED",
            "message": (
                "/ws/chat/{user_id} has been removed. Connect to /ws and "
                "send {type:'auth', ticket:'<ws_ticket>'} as the first frame, "
                "then {event:'msg:send', payload:{conversation_id, content}} "
                "to the AI conversation instead."
            ),
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    await ws.close(code=4410)
    _LOGGER.info("legacy_ws_chat_rejected user=%s", user_id)

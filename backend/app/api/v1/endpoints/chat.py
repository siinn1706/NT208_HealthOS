from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws.handlers import ConnectionManager

router = APIRouter()
chat_manager = ConnectionManager()


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(user_id: str, ws: WebSocket) -> None:
    await chat_manager.connect(ws, user_id)
    try:
        while True:
            payload = await ws.receive_json()
            message = payload.get("message", "")
            history = payload.get("history", [])

            if not isinstance(message, str) or not message.strip():
                await chat_manager.send_to_ws(ws, {
                    "sender": "system",
                    "message": "Invalid payload. `message` must be a non-empty string.",
                })
                continue

            if not isinstance(history, list):
                history = []

            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(
                        "http://localhost:8001/api/ai/generate",
                        json={"user_id": user_id, "message": message, "history": history},
                    )
                    response.raise_for_status()
                    ai_result = response.json()
            except (httpx.HTTPError, httpx.RequestError) as exc:
                await chat_manager.send_to_ws(ws, {
                    "sender": "system",
                    "message": f"AI worker unavailable: {exc}",
                })
                continue

            reply = ai_result.get("reply", "")
            await chat_manager.send_to_ws(ws, {"sender": "ai", "message": reply})

    except WebSocketDisconnect:
        chat_manager.disconnect(ws)
    except Exception as exc:
        await chat_manager.send_to_ws(ws, {
            "sender": "system",
            "message": f"Internal server error: {exc}",
        })
        chat_manager.disconnect(ws)

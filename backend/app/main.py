"""HealthOS Core BE — FastAPI application factory."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.adapters.redis_client import close_redis
from app.core.config import settings
from app.ws.handlers import manager
from app.ws.chat_router import handle_ws_event


@asynccontextmanager
async def lifespan(application: FastAPI):
    yield
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import logging
    logging.getLogger("healthos").exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {"reason": str(exc)} if settings.debug else {},
            }
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# ─── WebSocket ────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str | None = None) -> None:
    """
    WebSocket endpoint for realtime chat events.

    Authentication:
      ?token=<JWT access token>  (required)

    The client sends JSON frames:
      { "event": "<event_type>", "payload": { ... } }

    Server sends JSON frames:
      { "event": "<event_type>", "payload": { ... }, "timestamp": "<ISO8601>" }

    Supported client events:
      client:hello, conv:join, msg:send, msg:edit, msg:delete,
      msg:react, msg:pin, msg:unpin, msg:read, typing, conv:sync, pong
    """
    import datetime
    import json
    import uuid
    import logging

    from jose import JWTError
    from app.core.security import decode_access_token
    from app.adapters.database import AsyncSessionLocal

    log = logging.getLogger("healthos.ws")

    # ── Auth ──────────────────────────────────────────────────────────────────
    if not token:
        await ws.accept()
        await ws.send_json({
            "event": "error",
            "payload": {"code": "AUTH_REQUIRED", "message": "Missing ?token= query param."},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        await ws.close(code=4001)
        return

    try:
        payload = decode_access_token(token)
        user_id_str = payload.get("sub", "")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError, TypeError):
        await ws.accept()
        await ws.send_json({
            "event": "error",
            "payload": {"code": "AUTH_INVALID_TOKEN", "message": "Invalid or expired token."},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        await ws.close(code=4001)
        return

    # ── Connected ─────────────────────────────────────────────────────────────
    await manager.connect(ws, user_id_str)
    log.info("WS connected: user=%s", user_id_str)

    # Auto-join user's personal room (for direct notifications)
    manager.join_room(ws, f"user:{user_id_str}")

    ts_now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()  # noqa: E731

    try:
        while True:
            raw = await ws.receive_text()
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
            payload_data = frame.get("payload", {})

            # Delegate all event handling to the chat router module
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
        log.info("WS disconnected: user=%s", disconnected_user)
        # Broadcast offline status to all rooms this user was in
        if disconnected_user:
            presence = manager.get_presence(disconnected_user)
            offline_event = {
                "event": "user.status",
                "payload": {
                    "user_id": disconnected_user,
                    "is_online": False,
                    "last_seen_at": presence.get("last_seen_at"),
                },
                "timestamp": ts_now(),
            }
            # Notify users who were in the same rooms
            for room in list(manager.room_connections.keys()):
                if room.startswith("conv:"):
                    await manager.broadcast(room, offline_event)
    except Exception as exc:
        log.exception("WS error for user=%s: %s", user_id_str, exc)
        manager.disconnect(ws)

"""HealthOS Core BE — FastAPI application factory."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.adapters.redis_client import close_redis
from app.adapters.database import engine
from app.core.config import settings
from app.ws.handlers import manager
from app.ws.chat_router import handle_ws_event

_startup_logger = logging.getLogger("healthos")


@asynccontextmanager
async def lifespan(application: FastAPI):
    yield
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

if settings.debug:
    _startup_logger.warning(
        "DEBUG MODE ENABLED — OTP values exposed in responses. "
        "Never enable DEBUG in a publicly reachable environment."
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Normalise all HTTPException details to { error: { code, message } }."""
    detail = exc.detail
    if isinstance(detail, dict):
        error_body = detail
    else:
        error_body = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": error_body})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return Pydantic validation errors in the standard error envelope."""
    field_errors: dict[str, str] = {}
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"] if p != "body")
        field_errors[loc] = err["msg"]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Dữ liệu không hợp lệ",
                "field_errors": field_errors,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    _startup_logger.exception("Unhandled exception: %s", exc)
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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Accept-Language", "X-Request-ID"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all HTTP responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # API-only CSP — no scripts served; frame-ancestors blocks clickjacking
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response

app.include_router(v1_router)


@app.get("/health")
async def health() -> JSONResponse:
    from app.adapters.redis_client import get_redis
    from app.adapters.database import engine
    from sqlalchemy import text

    checks: dict[str, str] = {"db": "ok", "redis": "ok"}
    status_code = 200

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        checks["db"] = "error"
        status_code = 503

    try:
        r = await get_redis()
        await r.ping()
    except Exception:
        checks["redis"] = "error"
        status_code = 503

    return JSONResponse(
        content={"status": "ok" if status_code == 200 else "degraded", **checks},
        status_code=status_code,
    )


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
    from app.core.security import JWT_BLACKLIST_PREFIX, decode_access_token
    from app.adapters.database import AsyncSessionLocal
    from app.adapters.redis_client import get_redis

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
        token_type = payload.get("typ")
        if token_type != "ws_ticket":
            raise JWTError("invalid token type for websocket")
        # Check revocation blacklist (ws_tickets have a jti too)
        jti = payload.get("jti")
        if jti:
            redis_conn = await get_redis()
            revoked = await redis_conn.exists(f"{JWT_BLACKLIST_PREFIX}{jti}")
            if revoked:
                raise JWTError("ws_ticket has been revoked")
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

    # Maximum inbound WS frame size: 64 KiB is generous for chat messages and
    # prevents memory exhaustion from maliciously large frames.
    _WS_MAX_FRAME_BYTES = 65_536

    try:
        while True:
            raw = await ws.receive_text()
            if len(raw.encode("utf-8")) > _WS_MAX_FRAME_BYTES:
                await manager.send_to_ws(ws, {
                    "event": "error",
                    "payload": {"code": "FRAME_TOO_LARGE", "message": "Message frame exceeds maximum allowed size."},
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

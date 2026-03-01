"""HealthOS Core BE — FastAPI application factory."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.adapters.redis_client import close_redis
from app.core.config import settings
from app.ws.handlers import manager


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup: initialise connections (DB pool is lazy via SQLAlchemy)
    yield
    # Shutdown: clean up
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────
app.include_router(v1_router)


# ─── WebSocket ────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, room: str = "global") -> None:
    """
    WebSocket endpoint for realtime events.
    Query param ?room=user:<user_id> to join a user-specific room.
    TODO: Validate JWT token via query param before accepting.
    """
    await manager.connect(ws, room)
    try:
        while True:
            data = await ws.receive_text()
            # Echo for now — replace with event routing
            await ws.send_text(f"echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(ws, room)

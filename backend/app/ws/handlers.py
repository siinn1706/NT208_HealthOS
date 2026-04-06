"""WebSocket connection manager for realtime chat events.

Design:
  - User-level routing: all sockets of a user receive messages (multi-device).
  - Room-level routing: all members of a conversation receive new messages.
  - Online presence tracking per user.
  - Heartbeat: server sends ping every 30s.
  - Rate limiting: 5 sends/second per user (token bucket).

ACCEPTED LIMITATION — In-process WS presence state (#6):
  All connection state (user_connections, room_connections, presence, rate-limiter
  buckets) is stored in a single Python dict in this process. This means:
    * Presence and online/offline events are NOT shared across multiple worker
      processes or replicas.
    * A user connected to worker A appears offline to worker B.
  Resolution path: replace in-process state with a Redis Pub/Sub fan-out and a
  Redis-backed presence store (e.g. HSET healthos:presence:<user_id> ...).
  For the current single-worker student deployment this is an acceptable trade-off.
"""
from __future__ import annotations

import asyncio
import datetime
import time
from typing import Any

from fastapi import WebSocket


class _RateLimiter:
    """Token bucket rate limiter — 5 tokens/s, burst up to 10."""

    RATE = 5.0   # tokens per second
    BURST = 10   # max bucket size

    def __init__(self) -> None:
        self._buckets: dict[str, tuple[float, float]] = {}  # user_id → (tokens, last_refill_ts)

    def allow(self, user_id: str) -> bool:
        now = time.monotonic()
        tokens, last = self._buckets.get(user_id, (self.BURST, now))
        elapsed = now - last
        tokens = min(self.BURST, tokens + elapsed * self.RATE)
        if tokens < 1:
            self._buckets[user_id] = (tokens, now)
            return False
        self._buckets[user_id] = (tokens - 1, now)
        return True

    def cleanup(self, user_id: str) -> None:
        self._buckets.pop(user_id, None)


class ConnectionManager:
    """
    Manages all active WebSocket connections.

    Routing layers:
      user_connections[user_id]   → set of WebSocket  (multi-device)
      room_connections[room_id]   → set of WebSocket  (conversation room)
      ws_to_user[ws]              → user_id            (reverse lookup)
      ws_to_rooms[ws]             → set of room_id     (reverse lookup)
      presence[user_id]           → { is_online, last_seen_at }
    """

    HEARTBEAT_INTERVAL = 30  # seconds between server pings
    MAX_CONNECTIONS_PER_USER = 10  # H8: per-user connection limit

    def __init__(self) -> None:
        self.user_connections: dict[str, set[WebSocket]] = {}
        self.room_connections: dict[str, set[WebSocket]] = {}
        self.ws_to_user: dict[WebSocket, str] = {}
        self.ws_to_rooms: dict[WebSocket, set[str]] = {}
        self.presence: dict[str, dict[str, Any]] = {}
        self._rate_limiter = _RateLimiter()
        self._heartbeat_tasks: dict[WebSocket, asyncio.Task] = {}

    # ──────────────────────────────────────────────────────────────────────────
    # Connection lifecycle
    # ──────────────────────────────────────────────────────────────────────────

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        # H8: Check per-user connection limit before accepting
        current_count = len(self.user_connections.get(user_id, set()))
        if current_count >= self.MAX_CONNECTIONS_PER_USER:
            await ws.accept()
            await ws.send_json({
                "event": "error",
                "payload": {"code": "TOO_MANY_CONNECTIONS", "message": f"Maximum {self.MAX_CONNECTIONS_PER_USER} connections per user exceeded."},
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })
            await ws.close(code=4008)
            return
        await ws.accept()
        self.user_connections.setdefault(user_id, set()).add(ws)
        self.ws_to_user[ws] = user_id
        self.ws_to_rooms[ws] = set()
        self.presence[user_id] = {"is_online": True, "last_seen_at": None}
        task = asyncio.create_task(self._heartbeat_loop(ws))
        self._heartbeat_tasks[ws] = task

    def disconnect(self, ws: WebSocket) -> str | None:
        """Remove a WebSocket. Returns the user_id that was disconnected, or None."""
        user_id = self.ws_to_user.pop(ws, None)
        if user_id:
            task = self._heartbeat_tasks.pop(ws, None)
            if task:
                task.cancel()
            sockets = self.user_connections.get(user_id, set())
            sockets.discard(ws)
            if not sockets:
                self.user_connections.pop(user_id, None)
                self._rate_limiter.cleanup(user_id)
                self.presence[user_id] = {
                    "is_online": False,
                    "last_seen_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
            for room in self.ws_to_rooms.pop(ws, set()):
                room_sockets = self.room_connections.get(room, set())
                room_sockets.discard(ws)
                if not room_sockets:
                    self.room_connections.pop(room, None)
        return user_id

    # ──────────────────────────────────────────────────────────────────────────
    # Room management
    # ──────────────────────────────────────────────────────────────────────────

    def join_room(self, ws: WebSocket, room: str) -> None:
        self.room_connections.setdefault(room, set()).add(ws)
        if ws in self.ws_to_rooms:
            self.ws_to_rooms[ws].add(room)

    def leave_room(self, ws: WebSocket, room: str) -> None:
        sockets = self.room_connections.get(room, set())
        sockets.discard(ws)
        if not sockets:
            self.room_connections.pop(room, None)
        if ws in self.ws_to_rooms:
            self.ws_to_rooms[ws].discard(room)

    # ──────────────────────────────────────────────────────────────────────────
    # Sending
    # ──────────────────────────────────────────────────────────────────────────

    async def send_to_ws(self, ws: WebSocket, message: dict) -> None:
        try:
            await ws.send_json(message)
        except Exception:
            # M11: Dead socket cleanup — remove from tracking to prevent repeated failures
            user_id = self.ws_to_user.get(ws)
            if user_id and ws in self.user_connections.get(user_id, set()):
                self.user_connections[user_id].discard(ws)

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Deliver to ALL connected sockets of a user (multi-device)."""
        for ws in list(self.user_connections.get(user_id, set())):
            await self.send_to_ws(ws, message)

    async def broadcast(self, room: str, message: dict, exclude_ws: WebSocket | None = None) -> None:
        """Broadcast to all WebSockets in a room, optionally skipping one socket."""
        for ws in list(self.room_connections.get(room, set())):
            if ws is not exclude_ws:
                await self.send_to_ws(ws, message)

    # ──────────────────────────────────────────────────────────────────────────
    # Rate limiting
    # ──────────────────────────────────────────────────────────────────────────

    def check_rate_limit(self, user_id: str) -> bool:
        return self._rate_limiter.allow(user_id)

    # ──────────────────────────────────────────────────────────────────────────
    # Presence
    # ──────────────────────────────────────────────────────────────────────────

    def get_presence(self, user_id: str) -> dict[str, Any]:
        return self.presence.get(user_id, {"is_online": False, "last_seen_at": None})

    def get_presence_map(self) -> dict[str, bool]:
        return {uid: info["is_online"] for uid, info in self.presence.items()}

    def is_online(self, user_id: str) -> bool:
        return self.presence.get(user_id, {}).get("is_online", False)

    def record_pong(self, ws: WebSocket) -> None:
        """Called when client sends 'pong' — heartbeat keepalive."""
        pass  # Token bucket keeps going regardless; extend here if adding pong timeouts

    # ──────────────────────────────────────────────────────────────────────────
    # Heartbeat
    # ──────────────────────────────────────────────────────────────────────────

    async def _heartbeat_loop(self, ws: WebSocket) -> None:
        import logging
        log = logging.getLogger("healthos.ws")
        try:
            while True:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
                await self.send_to_ws(ws, {"event": "ping", "payload": {}, "timestamp": ts})
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            # M12: Log heartbeat exceptions instead of silently swallowing
            log.debug("Heartbeat ended: %s", exc)


manager = ConnectionManager()

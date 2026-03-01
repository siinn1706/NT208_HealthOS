"""WebSocket connection manager for realtime events."""
from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections, grouped by room."""

    def __init__(self) -> None:
        # room_id → list of WebSocket connections
        self._rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, room: str) -> None:
        await ws.accept()
        self._rooms.setdefault(room, []).append(ws)

    def disconnect(self, ws: WebSocket, room: str) -> None:
        if room in self._rooms:
            self._rooms[room] = [c for c in self._rooms[room] if c is not ws]

    async def broadcast(self, room: str, message: dict) -> None:
        """Send a JSON message to all connections in a room."""
        for connection in self._rooms.get(room, []):
            try:
                await connection.send_json(message)
            except RuntimeError:
                pass  # Connection already closed


manager = ConnectionManager()

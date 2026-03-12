"""Event emitter service for publishing events with standardized envelope."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from app.schemas.events import EventEnvelope, EventMetadata


class EventEmitter:
    """Service for emitting events with standardized envelope.

    Usage:
        emitter = EventEmitter()
        emitter.emit(
            event_type="chat.message.sent",
            payload={"message_id": "..."},
            user_id=user_id,
            correlation_id=correlation_id,
            publish_fn=publish_to_websocket
        )
    """

    def __init__(self) -> None:
        pass

    def create_envelope(
        self,
        event_type: str,
        payload: dict[str, Any],
        user_id: UUID | None = None,
        correlation_id: UUID | None = None,
    ) -> EventEnvelope:
        """Create an event envelope with standard format."""
        metadata = EventMetadata(
            event_id=uuid4(),
            timestamp=datetime.now(),
            user_id=user_id,
            correlation_id=correlation_id,
        )
        return EventEnvelope(
            event=event_type,
            version="1.0",
            payload=payload,
            metadata=metadata,
        )

    def emit(
        self,
        event_type: str,
        payload: dict[str, Any],
        user_id: UUID | None = None,
        correlation_id: UUID | None = None,
        publish_fn: Callable[[dict[str, Any]], Any] | None = None,
    ) -> EventEnvelope:
        """Emit an event with standardized envelope.

        Args:
            event_type: The event type (e.g., "chat.message.sent")
            payload: The event-specific payload data
            user_id: Optional user ID for the event
            correlation_id: Optional correlation ID for tracing
            publish_fn: Optional function to publish the event

        Returns:
            The created EventEnvelope
        """
        envelope = self.create_envelope(event_type, payload, user_id, correlation_id)

        if publish_fn:
            publish_fn(envelope.model_dump(mode="json"))

        return envelope

    def emit_to_ws(
        self,
        event_type: str,
        payload: dict[str, Any],
        user_id: UUID | None = None,
        correlation_id: UUID | None = None,
    ) -> dict[str, Any]:
        """Emit an event formatted for WebSocket broadcast.

        Returns the raw dict (not EventEnvelope) for WS compatibility.
        """
        envelope = self.create_envelope(event_type, payload, user_id, correlation_id)
        return envelope.model_dump(mode="json")


# Global emitter instance
event_emitter = EventEmitter()

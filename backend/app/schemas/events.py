"""Event envelope schemas for standardized event contracts."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class EventMetadata(BaseModel):
    """Common metadata for all events."""
    event_id: UUID = Field(default_factory=uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: UUID | None = None
    correlation_id: UUID | None = None


class EventEnvelope(BaseModel):
    """Canonical event envelope used by all event publishers.

    Format:
    {
        "event": "event.type",
        "version": "1.0",
        "payload": {...},
        "metadata": {
            "event_id": "uuid",
            "timestamp": "ISO8601",
            "user_id": "uuid",
            "correlation_id": "uuid"
        }
    }
    """
    event: str
    version: Literal["1.0"] = "1.0"
    payload: dict[str, Any]
    metadata: EventMetadata = Field(default_factory=EventMetadata)

    def model_dump(self, **kwargs) -> dict[str, Any]:
        """Override to ensure proper serialization."""
        return super().model_dump(**kwargs)

"""Event envelope schemas for standardized event contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class EventMetadata(BaseModel):
    """Common metadata for all events."""
    event_id: UUID = Field(default_factory=UUID)
    timestamp: datetime = Field(default_factory=datetime.now)
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

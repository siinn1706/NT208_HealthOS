"""Pydantic mirrors of the notification.requested event contract.

Used in tests for structured construction; runtime validation uses raw jsonschema
to avoid double-validation cost.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class NotificationRecipient(BaseModel):
    user_id: uuid.UUID
    email: Optional[str] = None
    push_token: Optional[str] = None
    phone: Optional[str] = None


class NotificationTemplate(BaseModel):
    id: str
    variables: Optional[dict[str, Any]] = None


class NotificationPayload(BaseModel):
    recipient: NotificationRecipient
    channels: list[str] = Field(min_length=1)
    template: NotificationTemplate
    priority: str = "normal"


class NotificationMetadata(BaseModel):
    event_id: uuid.UUID
    timestamp: datetime
    user_id: uuid.UUID
    correlation_id: Optional[uuid.UUID] = None


class NotificationEnvelope(BaseModel):
    event: str = "notification.requested"
    version: str = "1.0"
    payload: NotificationPayload
    metadata: NotificationMetadata

"""Pydantic schemas for the notifications endpoint module.

Cursor pagination follows the api-conventions.md envelope:
  * Response: { data: [...], meta: { next_cursor, has_more, ... } }
  * Cursor is opaque base64 of `<created_at_iso>|<id>` (caller treats as token).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


DataT = TypeVar("DataT")


class NotificationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    body: str
    kind: str = "info"
    reference_id: Optional[uuid.UUID] = None
    link: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class NotificationListMeta(BaseModel):
    """Cursor pagination meta — `next_cursor` is null when no more pages."""

    next_cursor: Optional[str] = None
    has_more: bool = False
    per_page: int = 20


class NotificationListResponse(BaseModel, Generic[DataT]):
    data: list[NotificationDTO]
    meta: NotificationListMeta


class NotificationResponse(DataResponse[NotificationDTO]):
    ...


class UnreadCountData(BaseModel):
    unread: int = Field(ge=0)


class UnreadCountResponse(DataResponse[UnreadCountData]):
    ...


class MarkAllReadData(BaseModel):
    marked: int = Field(ge=0)


class MarkAllReadResponse(DataResponse[MarkAllReadData]):
    ...


class NotificationPreferencesData(BaseModel):
    enabled: bool = True
    categories: dict[str, bool] = Field(
        default_factory=lambda: {
            "med": True,
            "appt": True,
            "vitals": True,
            "activity": True,
            "goal": True,
        },
    )
    channels: dict[str, bool] = Field(
        default_factory=lambda: {
            "push": True,
            "sound": True,
            "haptics": False,
        },
    )
    quiet_hours: dict[str, str] = Field(
        default_factory=lambda: {"start": "22:00", "end": "07:00"},
    )
    critical_bypass: bool = False
    snooze_options: list[int] = Field(default_factory=lambda: [5, 10, 30])


class NotificationPreferencesUpdateBody(BaseModel):
    enabled: bool | None = None
    categories: dict[str, bool] | None = None
    channels: dict[str, bool] | None = None
    quiet_hours: dict[str, str] | None = None
    critical_bypass: bool | None = None
    snooze_options: list[int] | None = None


class NotificationPreferencesResponse(DataResponse[NotificationPreferencesData]):
    ...

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

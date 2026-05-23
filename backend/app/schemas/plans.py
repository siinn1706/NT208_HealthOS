"""Pydantic schemas for the plans endpoint."""
from __future__ import annotations

import base64
import logging
import uuid
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger(__name__)


# ── DTOs ─────────────────────────────────────────────────────────────────────

class PlanDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    category: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    items: Optional[list[dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None


class PlanCreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=64)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    items: Optional[list[dict[str, Any]]] = None


class PlanUpdateBody(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=64)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    items: Optional[list[dict[str, Any]]] = None
    # user_id and status are rejected — never accepted in PATCH body


# ── Responses ─────────────────────────────────────────────────────────────────

class PlanListMeta(BaseModel):
    next_cursor: Optional[str] = None
    has_more: bool = False
    per_page: int = 20


class PlanListResponse(BaseModel):
    data: list[PlanDTO]
    meta: PlanListMeta


class PlanResponse(BaseModel):
    data: PlanDTO


# ── Cursor helpers ────────────────────────────────────────────────────────────

def encode_plan_cursor(created_at: datetime, plan_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{plan_id}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_plan_cursor(cursor: Optional[str]) -> Optional[tuple[datetime, uuid.UUID]]:
    if not cursor:
        return None
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        ts_str, id_str = raw.split("|", 1)
        return datetime.fromisoformat(ts_str), uuid.UUID(id_str)
    except (ValueError, UnicodeDecodeError, AttributeError):
        logger.debug("Discarding malformed plan cursor: %r", cursor)
        return None

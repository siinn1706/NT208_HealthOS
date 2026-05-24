from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_active_ban(user: Any, *, now: datetime | None = None) -> bool:
    banned_at = getattr(user, "banned_at", None)
    if banned_at is None:
        return False
    banned_until = getattr(user, "banned_until", None)
    if banned_until is None:
        return True
    effective_now = now or utc_now()
    return normalize_datetime(banned_until) > normalize_datetime(effective_now)

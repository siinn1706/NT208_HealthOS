"""Notifications service.

Responsibilities:
  * `enqueue(...)` — single insert point for any feature that wants to drop
    a notification on a user (reminder firing, export-ready, deletion-requested,
    OAuth-link added, etc.). Keeps a uniform shape (kind + reference_id + link).
  * `list_for_user(...)` — cursor-paginated read used by the popover and the
    `/dashboard/notifications` "see all" page.
  * `mark_read` / `mark_all_read` / `count_unread` — popover badge support.

Cursor format: opaque base64 of `<created_at ISO 8601>|<uuid>`. Decoding errors
are treated as "no cursor" so a fresh client can recover by paging from the top.
"""
from __future__ import annotations

import base64
import datetime
import logging
import uuid
from typing import Optional

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Notification, NotificationKindEnum, UserPreference

logger = logging.getLogger(__name__)


MAX_PER_PAGE = 50
DEFAULT_PER_PAGE = 20

_DEFAULT_NOTIFICATION_PREFERENCES = {
    "enabled": True,
    "categories": {
        "med": True,
        "appt": True,
        "vitals": True,
        "activity": True,
        "goal": True,
    },
    "channels": {
        "push": True,
        "sound": True,
        "haptics": False,
    },
    "quiet_hours": {"start": "22:00", "end": "07:00"},
    "critical_bypass": False,
    "snooze_options": [5, 10, 30],
}

def _coerce_snooze_options(value: object | None) -> list[int]:
    raw = value if isinstance(value, list) else _DEFAULT_NOTIFICATION_PREFERENCES["snooze_options"]
    out: list[int] = []
    seen: set[int] = set()
    for item in raw:
        if isinstance(item, bool):
            continue
        try:
            minutes = int(item)
        except (TypeError, ValueError):
            continue
        if minutes < 1 or minutes > 24 * 60 or minutes in seen:
            continue
        seen.add(minutes)
        out.append(minutes)
    return out or list(_DEFAULT_NOTIFICATION_PREFERENCES["snooze_options"])


def _encode_cursor(created_at: datetime.datetime, notif_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{notif_id}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: Optional[str]) -> Optional[tuple[datetime.datetime, uuid.UUID]]:
    if not cursor:
        return None
    try:
        # Restore base64 padding.
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        ts_str, id_str = raw.split("|", 1)
        return datetime.datetime.fromisoformat(ts_str), uuid.UUID(id_str)
    except (ValueError, UnicodeDecodeError, AttributeError):
        logger.debug("Discarding malformed notification cursor: %r", cursor)
        return None


async def list_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    cursor: Optional[str] = None,
    per_page: int = DEFAULT_PER_PAGE,
    only_unread: bool = False,
) -> tuple[list[Notification], Optional[str], bool]:
    """Cursor-paginated, newest-first.

    Returns (items, next_cursor, has_more). `next_cursor` is None when no more.
    Fetches `per_page + 1` rows so we can cheaply detect a next page.
    """
    per_page = max(1, min(per_page, MAX_PER_PAGE))

    stmt = select(Notification).where(Notification.user_id == user_id)
    if only_unread:
        stmt = stmt.where(Notification.is_read.is_(False))

    decoded = _decode_cursor(cursor)
    if decoded is not None:
        ts, last_id = decoded
        # Strict tuple-comparison ensures stable order across same-timestamp rows.
        stmt = stmt.where(
            (Notification.created_at < ts)
            | and_(Notification.created_at == ts, Notification.id < last_id)
        )

    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(per_page + 1)

    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    has_more = len(rows) > per_page
    page = rows[:per_page]
    next_cursor = _encode_cursor(page[-1].created_at, page[-1].id) if has_more and page else None
    return page, next_cursor, has_more


async def mark_read(
    db: AsyncSession,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Optional[Notification]:
    """Idempotent — calling twice is fine."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    )
    result = await db.execute(stmt)
    notif = result.scalar_one_or_none()
    if notif is None:
        return None
    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.datetime.now(datetime.timezone.utc)
        await db.flush()
    return notif


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Bulk-mark-as-read; returns rows touched."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.datetime.now(datetime.timezone.utc))
    )
    result = await db.execute(stmt)
    return int(result.rowcount or 0)


async def count_unread(db: AsyncSession, user_id: uuid.UUID) -> int:
    stmt = select(func.count(Notification.id)).where(
        Notification.user_id == user_id,
        Notification.is_read.is_(False),
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


# B7 review P2-7 — Notification.link allowlist.
#
# `link` is consumed by FE code that calls `router.push(link)` /
# `window.location.assign(link)`. Without validation, anything that flows
# user input into a notification link would be an open-redirect / XSS
# vector (`javascript:`, `https://evil.com`, `data:` etc.). Today every
# call site uses a hardcoded literal, but defense-in-depth means we
# enforce the contract at insert time too.
_LINK_ALLOWED_PREFIXES: tuple[str, ...] = (
    "/dashboard/",
    "/legal/",
    "/login",
    "/onboarding",
)


def _validate_link(link: Optional[str]) -> Optional[str]:
    if link is None:
        return None
    stripped = link.strip()
    if not stripped:
        return None
    # Only relative app-internal paths are accepted. The FE adds the locale
    # prefix when navigating; raw URLs and non-allowlisted schemes are dropped.
    if not stripped.startswith("/"):
        logger.warning("Rejecting non-relative notification link: %r", stripped)
        return None
    if any(stripped.startswith(p) for p in _LINK_ALLOWED_PREFIXES):
        return stripped
    logger.warning("Rejecting notification link outside allowlist: %r", stripped)
    return None


async def enqueue(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    title: str,
    body: str,
    kind: NotificationKindEnum | str = NotificationKindEnum.INFO,
    reference_id: Optional[uuid.UUID] = None,
    link: Optional[str] = None,
    commit: bool = False,
) -> Notification:
    """Insert a notification.

    Other services (reminders, exports, account flows) call this; if they're
    inside a larger transaction they pass `commit=False` and let the
    enclosing endpoint commit.

    `link` is validated against `_LINK_ALLOWED_PREFIXES`; values outside the
    allowlist are dropped (logged) rather than persisted.
    """
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        kind=kind.value if isinstance(kind, NotificationKindEnum) else kind,
        reference_id=reference_id,
        link=_validate_link(link),
    )
    db.add(notif)
    await db.flush()
    if commit:
        await db.commit()
    return notif


def _normalized_preferences(value: object | None) -> dict:
    if not isinstance(value, dict):
        return dict(_DEFAULT_NOTIFICATION_PREFERENCES)

    categories = value.get("categories")
    if not isinstance(categories, dict):
        categories = dict(_DEFAULT_NOTIFICATION_PREFERENCES["categories"])
    channels = value.get("channels")
    if not isinstance(channels, dict):
        channels = dict(_DEFAULT_NOTIFICATION_PREFERENCES["channels"])
    quiet_hours = value.get("quiet_hours")
    if not isinstance(quiet_hours, dict):
        quiet_hours = dict(_DEFAULT_NOTIFICATION_PREFERENCES["quiet_hours"])

    return {
        "enabled": bool(value.get("enabled", _DEFAULT_NOTIFICATION_PREFERENCES["enabled"])),
        "categories": {
            "med": bool(categories.get("med", True)),
            "appt": bool(categories.get("appt", True)),
            "vitals": bool(categories.get("vitals", True)),
            "activity": bool(categories.get("activity", True)),
            "goal": bool(categories.get("goal", True)),
        },
        "channels": {
            "push": bool(channels.get("push", True)),
            "sound": bool(channels.get("sound", True)),
            "haptics": bool(channels.get("haptics", False)),
        },
        "quiet_hours": {
            "start": str(quiet_hours.get("start", "22:00")),
            "end": str(quiet_hours.get("end", "07:00")),
        },
        "critical_bypass": bool(value.get("critical_bypass", False)),
        "snooze_options": _coerce_snooze_options(value.get("snooze_options")),
    }


async def get_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> dict:
    row = (
        await db.execute(select(UserPreference).where(UserPreference.user_id == user_id))
    ).scalar_one_or_none()
    if row is None:
        return dict(_DEFAULT_NOTIFICATION_PREFERENCES)
    appearance = row.appearance if isinstance(row.appearance, dict) else {}
    return _normalized_preferences(appearance.get("notification_preferences"))


async def update_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
    patch: dict,
) -> dict:
    row = (
        await db.execute(select(UserPreference).where(UserPreference.user_id == user_id))
    ).scalar_one_or_none()
    if row is None:
        row = UserPreference(user_id=user_id)
        db.add(row)
        await db.flush()

    appearance = row.appearance if isinstance(row.appearance, dict) else {}
    current = _normalized_preferences(appearance.get("notification_preferences"))

    next_data = dict(current)
    if "enabled" in patch:
        next_data["enabled"] = bool(patch["enabled"])
    if "categories" in patch and isinstance(patch["categories"], dict):
        next_data["categories"] = {**next_data["categories"], **patch["categories"]}
    if "channels" in patch and isinstance(patch["channels"], dict):
        next_data["channels"] = {**next_data["channels"], **patch["channels"]}
    if "quiet_hours" in patch and isinstance(patch["quiet_hours"], dict):
        next_data["quiet_hours"] = {**next_data["quiet_hours"], **patch["quiet_hours"]}
    if "critical_bypass" in patch:
        next_data["critical_bypass"] = bool(patch["critical_bypass"])
    if "snooze_options" in patch and isinstance(patch["snooze_options"], list):
        next_data["snooze_options"] = _coerce_snooze_options(patch["snooze_options"])

    appearance["notification_preferences"] = _normalized_preferences(next_data)
    row.appearance = appearance
    await db.flush()
    return _normalized_preferences(appearance["notification_preferences"])

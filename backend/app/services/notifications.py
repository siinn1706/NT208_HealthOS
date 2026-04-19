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

from app.models.core import Notification, NotificationKindEnum

logger = logging.getLogger(__name__)


MAX_PER_PAGE = 50
DEFAULT_PER_PAGE = 20


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

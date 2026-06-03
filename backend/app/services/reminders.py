from __future__ import annotations

import datetime
import logging
import uuid
from typing import Iterable, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    ReminderRepeatEnum,
    ReminderTypeEnum,
)
from app.schemas.reminders import ReminderCreateBody, ReminderDTO
from app.services._ownership import get_owned
from app.services.reminder_recurrence import (
    DEFAULT_TZID,
    compute_next_n,
    derive_next_occurrence_at,
)

logger = logging.getLogger(__name__)


def _parse_time(value: str) -> str:
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            parsed = datetime.datetime.strptime(value, fmt).time()
            return parsed.strftime("%H:%M")
        except ValueError:
            continue
    raise ValueError("time must be in HH:MM or HH:MM:SS format")


def _parse_time_object(value: str) -> datetime.time:
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    raise ValueError("time must be in HH:MM or HH:MM:SS format")


def _to_type(value: str) -> ReminderTypeEnum:
    return ReminderTypeEnum(value)


def _to_repeat(value: str) -> ReminderRepeatEnum:
    return ReminderRepeatEnum(value)


def _to_dto(item: Reminder) -> ReminderDTO:
    return ReminderDTO(
        id=item.id,
        type=item.type.value,
        title=item.title,
        time=item.remind_time,
        repeat=item.repeat.value,
        done=item.done,
        note=item.note,
        tzid=item.tzid or DEFAULT_TZID,
        weekday_mask=item.weekday_mask,
        day_of_month=item.day_of_month,
        next_occurrence_at=item.next_occurrence_at,
        medication_plan_id=item.medication_plan_id,
    )


async def list_reminders(
    db: AsyncSession,
    user_id: uuid.UUID,
    type_filter: str | None = None,
    upcoming_only: bool = False,
) -> list[ReminderDTO]:
    stmt = select(Reminder).where(Reminder.user_id == user_id)
    if type_filter:
        stmt = stmt.where(Reminder.type == ReminderTypeEnum(type_filter))
    if upcoming_only:
        stmt = stmt.where(Reminder.done.is_(False))

    rows = (
        await db.execute(
            stmt.order_by(
                Reminder.done.asc(),
                Reminder.remind_time.asc(),
                Reminder.created_at.desc(),
            )
        )
    ).scalars().all()
    return [_to_dto(row) for row in rows]


async def create_reminder(
    db: AsyncSession,
    user_id: uuid.UUID,
    body: ReminderCreateBody,
) -> ReminderDTO:
    parsed_time = _parse_time_object(body.time)
    item = Reminder(
        user_id=user_id,
        type=_to_type(body.type),
        title=body.title,
        remind_time=parsed_time.strftime("%H:%M"),
        time_of_day=parsed_time,
        repeat=_to_repeat(body.repeat),
        note=body.note,
        done=False,
        tzid=body.tzid or DEFAULT_TZID,
        weekday_mask=body.weekday_mask,
        day_of_month=body.day_of_month,
        start_date=body.start_date,
        end_date=body.end_date,
        is_active=True,
    )
    db.add(item)
    await db.flush()
    item.next_occurrence_at = derive_next_occurrence_at(item)
    await db.flush()
    await materialize_for_reminder(db, item)
    await db.refresh(item)
    return _to_dto(item)


async def materialize_for_reminder(
    db: AsyncSession,
    reminder: Reminder,
    *,
    now: Optional[datetime.datetime] = None,
) -> int:
    """Idempotently insert occurrence rows for `reminder` over the next horizon.

    Returns count of newly inserted occurrences. Re-runs are cheap because the
    `(reminder_id, scheduled_at)` unique index lets us skip dupes silently.
    """
    if not reminder.is_active or reminder.done:
        return 0
    slots = compute_next_n(reminder, since=now)
    if not slots:
        return 0
    existing = (
        await db.execute(
            select(ReminderOccurrence.scheduled_at).where(
                ReminderOccurrence.reminder_id == reminder.id,
                ReminderOccurrence.scheduled_at.in_(slots),
            )
        )
    ).scalars().all()
    have = {dt for dt in existing}
    inserted = 0
    for slot in slots:
        if slot in have:
            continue
        db.add(
            ReminderOccurrence(
                reminder_id=reminder.id,
                scheduled_at=slot,
                status=ReminderOccurrenceStatusEnum.PENDING.value,
            )
        )
        inserted += 1
    if inserted:
        await db.flush()
    # Refresh denormalized pointer to the soonest pending slot.
    next_slot = await _next_pending_slot(db, reminder.id, now=now)
    reminder.next_occurrence_at = next_slot
    await db.flush()
    return inserted


async def _next_pending_slot(  # idor-ok: private helper — reminder ownership verified by caller
    db: AsyncSession,
    reminder_id: uuid.UUID,
    *,
    now: Optional[datetime.datetime] = None,
) -> Optional[datetime.datetime]:
    cutoff = now or datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(ReminderOccurrence.scheduled_at)
        .where(
            ReminderOccurrence.reminder_id == reminder_id,
            ReminderOccurrence.scheduled_at >= cutoff,
            ReminderOccurrence.status == ReminderOccurrenceStatusEnum.PENDING.value,
        )
        .order_by(ReminderOccurrence.scheduled_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def update_reminder_done(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    done: bool,
) -> ReminderDTO | None:
    item = await get_owned(db, Reminder, id_=reminder_id, user_id=user_id)
    if item is None:
        return None

    item.done = done
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)


async def delete_reminder(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
) -> bool:
    item = await get_owned(db, Reminder, id_=reminder_id, user_id=user_id)
    if item is None:
        return False

    await db.delete(item)
    await db.flush()
    return True


# ─── B7 P5 — occurrence operations ───────────────────────────────────────


async def _resolve_target_occurrence(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    occurrence_id: Optional[uuid.UUID] = None,
) -> Optional[tuple[ReminderOccurrence, Reminder]]:
    """Pick the occurrence to act on and return it alongside its parent Reminder.

    Returns a (ReminderOccurrence, Reminder) tuple so callers have the parent
    available without an extra round-trip. Returns None when no matching
    occurrence exists or the reminder is not owned by user_id.

    Cross-checks ownership via the JOIN — a user can only mutate occurrences
    that belong to their own reminders.
    """
    base = (
        select(ReminderOccurrence, Reminder)
        .join(Reminder, Reminder.id == ReminderOccurrence.reminder_id)
        .where(Reminder.id == reminder_id, Reminder.user_id == user_id)
    )
    if occurrence_id is not None:
        result = await db.execute(base.where(ReminderOccurrence.id == occurrence_id))
        row = result.one_or_none()
        return (row[0], row[1]) if row is not None else None

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        base.where(
            ReminderOccurrence.scheduled_at >= now_utc - datetime.timedelta(hours=1),
            ReminderOccurrence.status.in_(
                [
                    ReminderOccurrenceStatusEnum.PENDING.value,
                    ReminderOccurrenceStatusEnum.FIRED.value,
                ]
            ),
        ).order_by(ReminderOccurrence.scheduled_at.asc()).limit(1)
    )
    row = result.one_or_none()
    return (row[0], row[1]) if row is not None else None


async def skip_occurrence(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    occurrence_id: Optional[uuid.UUID] = None,
) -> Optional[tuple[ReminderOccurrence, Reminder]]:
    pair = await _resolve_target_occurrence(db, user_id, reminder_id, occurrence_id)
    if pair is None:
        return None
    occ, parent = pair
    occ.status = ReminderOccurrenceStatusEnum.SKIPPED.value
    occ.skipped_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    return occ, parent


async def snooze_occurrence(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    *,
    until: Optional[datetime.datetime] = None,
    minutes: Optional[int] = None,
    occurrence_id: Optional[uuid.UUID] = None,
) -> Optional[tuple[ReminderOccurrence, Reminder]]:
    if until is None and minutes is None:
        raise ValueError("snooze requires `until` or `minutes`")
    snooze_to = until or (
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=int(minutes or 0))
    )
    pair = await _resolve_target_occurrence(db, user_id, reminder_id, occurrence_id)
    if pair is None:
        return None
    occ, parent = pair
    occ.status = ReminderOccurrenceStatusEnum.SNOOZED.value
    occ.snoozed_until = snooze_to
    occ.scheduled_at = snooze_to  # so the firing job picks it up at the new time
    await db.flush()
    return occ, parent


async def mark_done_occurrence(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    occurrence_id: Optional[uuid.UUID] = None,
) -> Optional[tuple[ReminderOccurrence, Reminder]]:
    pair = await _resolve_target_occurrence(db, user_id, reminder_id, occurrence_id)
    if pair is None:
        return None
    occ, parent = pair
    occ.status = ReminderOccurrenceStatusEnum.DONE.value
    occ.done_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()

    # If this is a `once` reminder, archive the schedule so it stops materializing.
    # `parent` was already fetched by _resolve_target_occurrence — no extra query needed.
    if parent.repeat == ReminderRepeatEnum.ONCE:
        parent.is_active = False
        parent.done = True
        await db.flush()
    return occ, parent


async def list_occurrences_in_range(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    range_from: datetime.datetime,
    range_to: datetime.datetime,
    status_filter: Optional[Iterable[str]] = None,
) -> list[tuple[ReminderOccurrence, Reminder]]:
    """Pulls occurrences across all of a user's reminders in [from, to)."""
    stmt = (
        select(ReminderOccurrence, Reminder)
        .join(Reminder, Reminder.id == ReminderOccurrence.reminder_id)
        .where(
            Reminder.user_id == user_id,
            ReminderOccurrence.scheduled_at >= range_from,
            ReminderOccurrence.scheduled_at < range_to,
        )
        .order_by(ReminderOccurrence.scheduled_at.asc())
    )
    if status_filter:
        stmt = stmt.where(ReminderOccurrence.status.in_(list(status_filter)))
    rows = (await db.execute(stmt)).all()
    return [(occ, reminder) for occ, reminder in rows]


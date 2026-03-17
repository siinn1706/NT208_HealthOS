from __future__ import annotations

import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Reminder, ReminderRepeatEnum, ReminderTypeEnum
from app.schemas.reminders import ReminderCreateBody, ReminderDTO


def _parse_time(value: str) -> str:
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            parsed = datetime.datetime.strptime(value, fmt).time()
            return parsed.strftime("%H:%M")
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
    item = Reminder(
        user_id=user_id,
        type=_to_type(body.type),
        title=body.title,
        remind_time=_parse_time(body.time),
        repeat=_to_repeat(body.repeat),
        note=body.note,
        done=False,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)


async def update_reminder_done(
    db: AsyncSession,
    user_id: uuid.UUID,
    reminder_id: uuid.UUID,
    done: bool,
) -> ReminderDTO | None:
    item = (
        await db.execute(
            select(Reminder).where(
                Reminder.id == reminder_id,
                Reminder.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
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
    item = (
        await db.execute(
            select(Reminder).where(
                Reminder.id == reminder_id,
                Reminder.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        return False

    await db.delete(item)
    await db.flush()
    return True


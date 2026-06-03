from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.reminders import (
    ReminderCreateBody,
    ReminderDoneBody,
    ReminderListResponse,
    ReminderOccurrenceDTO,
    ReminderOccurrenceListResponse,
    ReminderOccurrenceResponse,
    ReminderResponse,
    ReminderSkipBody,
    ReminderSnoozeBody,
    ReminderUpdateBody,
)
from app.services import reminders as reminder_svc
from app.services.reminder_recurrence import DEFAULT_TZID, reminder_today_window

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get(
    "",
    response_model=ReminderListResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="List reminders",
)
async def list_reminders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    type: str | None = Query(default=None, pattern="^(medicine|appointment|exercise)$"),
) -> ReminderListResponse:
    items = await reminder_svc.list_reminders(
        db=db,
        user_id=current_user.id,
        type_filter=type,
        upcoming_only=False,
    )
    return ReminderListResponse(data=items)


@router.get(
    "/upcoming",
    response_model=ReminderListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List upcoming reminders",
)
async def list_upcoming_reminders(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderListResponse:
    items = await reminder_svc.list_reminders(
        db=db,
        user_id=current_user.id,
        upcoming_only=True,
    )
    return ReminderListResponse(data=items)


@router.post(
    "/upcoming",
    response_model=ReminderListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List upcoming reminders (POST compatibility)",
)
async def list_upcoming_reminders_post(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderListResponse:
    items = await reminder_svc.list_reminders(
        db=db,
        user_id=current_user.id,
        upcoming_only=True,
    )
    return ReminderListResponse(data=items)


@router.post(
    "",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="Create reminder",
)
async def create_reminder(
    body: ReminderCreateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderResponse:
    try:
        item = await reminder_svc.create_reminder(db, current_user.id, body)
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message=str(exc),
        ) from exc
    await db.commit()
    return ReminderResponse(data=item)


@router.patch(
    "/{reminder_id}",
    response_model=ReminderResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Update reminder status",
)
async def update_reminder(
    reminder_id: uuid.UUID,
    body: ReminderUpdateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderResponse:
    item = await reminder_svc.update_reminder_done(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
        done=body.done,
    )
    if item is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Reminder not found.",
        )
    await db.commit()
    return ReminderResponse(data=item)


@router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Delete reminder",
)
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await reminder_svc.delete_reminder(db, current_user.id, reminder_id)
    if not deleted:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Reminder not found.",
        )
    await db.commit()


# ─── B7 P5 — occurrence endpoints ────────────────────────────────────────


def _occurrence_dto(occ, reminder) -> ReminderOccurrenceDTO:
    return ReminderOccurrenceDTO(
        id=occ.id,
        reminder_id=occ.reminder_id,
        title=reminder.title,
        type=reminder.type.value,
        scheduled_at=occ.scheduled_at,
        status=occ.status,
        snoozed_until=occ.snoozed_until,
        done_at=occ.done_at,
        skipped_at=occ.skipped_at,
    )


@router.get(
    "/occurrences",
    response_model=ReminderOccurrenceListResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="List occurrences in a date range (server-driven 'today' tab)",
)
async def list_occurrences(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    range_from: Optional[datetime.datetime] = Query(default=None, alias="from"),
    range_to: Optional[datetime.datetime] = Query(default=None, alias="to"),
    tzid: str = Query(default=DEFAULT_TZID, max_length=64),
    today: bool = Query(default=False, description="Convenience: ignore from/to and use the today window in `tzid`."),
    status_filter: Optional[str] = Query(default=None, alias="status", max_length=128),
) -> ReminderOccurrenceListResponse:
    if today:
        range_from, range_to = reminder_today_window(tzid)
    if range_from is None or range_to is None or range_from >= range_to:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message="Provide a valid `from` < `to` window or set `today=true`.",
        )
    statuses = [s.strip() for s in status_filter.split(",")] if status_filter else None
    rows = await reminder_svc.list_occurrences_in_range(
        db=db,
        user_id=current_user.id,
        range_from=range_from,
        range_to=range_to,
        status_filter=statuses,
    )
    return ReminderOccurrenceListResponse(data=[_occurrence_dto(o, r) for o, r in rows])


@router.post(
    "/{reminder_id}/skip",
    response_model=ReminderOccurrenceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Skip the next (or specified) occurrence",
)
async def skip_reminder(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ReminderSkipBody = ReminderSkipBody(),  # noqa: B008 — pydantic default is intentional for empty body
) -> ReminderOccurrenceResponse:
    pair = await reminder_svc.skip_occurrence(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
        occurrence_id=body.occurrence_id,
    )
    if pair is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="No matching occurrence to skip.",
        )
    await db.commit()
    occ, parent = pair
    return ReminderOccurrenceResponse(data=_occurrence_dto(occ, parent))


@router.post(
    "/{reminder_id}/snooze",
    response_model=ReminderOccurrenceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Snooze the next (or specified) occurrence",
)
async def snooze_reminder(
    reminder_id: uuid.UUID,
    body: ReminderSnoozeBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderOccurrenceResponse:
    try:
        pair = await reminder_svc.snooze_occurrence(
            db=db,
            user_id=current_user.id,
            reminder_id=reminder_id,
            until=body.until,
            minutes=body.minutes,
            occurrence_id=body.occurrence_id,
        )
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message=str(exc),
        ) from exc
    if pair is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="No matching occurrence to snooze.",
        )
    await db.commit()
    occ, parent = pair
    return ReminderOccurrenceResponse(data=_occurrence_dto(occ, parent))


@router.post(
    "/{reminder_id}/done",
    response_model=ReminderOccurrenceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Mark the next (or specified) occurrence done",
)
async def mark_done(
    reminder_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ReminderDoneBody = ReminderDoneBody(),  # noqa: B008
) -> ReminderOccurrenceResponse:
    pair = await reminder_svc.mark_done_occurrence(
        db=db,
        user_id=current_user.id,
        reminder_id=reminder_id,
        occurrence_id=body.occurrence_id,
    )
    if pair is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="No matching occurrence to mark done.",
        )
    await db.commit()
    occ, parent = pair
    return ReminderOccurrenceResponse(data=_occurrence_dto(occ, parent))


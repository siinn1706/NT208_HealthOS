from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.reminders import (
    ReminderCreateBody,
    ReminderListResponse,
    ReminderResponse,
    ReminderUpdateBody,
)
from app.services import reminders as reminder_svc

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Reminder not found."},
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Reminder not found."},
        )
    await db.commit()


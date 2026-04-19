"""Notifications endpoint module.

Exposes the BFF-facing surface that the popover + full notifications page rely on:

  * `GET    /v1/notifications`               cursor-paginated list
  * `GET    /v1/notifications/unread-count`  popover badge
  * `POST   /v1/notifications/{id}/read`     mark a single notification read
  * `POST   /v1/notifications/read-all`      mark all read (idempotent)

Reads are scoped to `current_user`; there is no cross-user visibility.
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.notifications import (
    MarkAllReadData,
    MarkAllReadResponse,
    NotificationDTO,
    NotificationListMeta,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountData,
    UnreadCountResponse,
)
from app.services import notifications as notif_svc

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List notifications (cursor-paginated, newest first)",
)
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    cursor: Optional[str] = Query(default=None, max_length=256),
    per_page: int = Query(default=20, ge=1, le=50),
    only_unread: bool = Query(default=False),
) -> NotificationListResponse:
    items, next_cursor, has_more = await notif_svc.list_for_user(
        db=db,
        user_id=current_user.id,
        cursor=cursor,
        per_page=per_page,
        only_unread=only_unread,
    )
    return NotificationListResponse(
        data=[NotificationDTO.model_validate(item) for item in items],
        meta=NotificationListMeta(
            next_cursor=next_cursor,
            has_more=has_more,
            per_page=per_page,
        ),
    )


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Unread notification count for the current user",
)
async def unread_count(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UnreadCountResponse:
    count = await notif_svc.count_unread(db=db, user_id=current_user.id)
    return UnreadCountResponse(data=UnreadCountData(unread=count))


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Mark a notification as read (idempotent)",
)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationResponse:
    notif = await notif_svc.mark_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    if notif is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Notification not found."},
        )
    await db.commit()
    return NotificationResponse(data=NotificationDTO.model_validate(notif))


@router.post(
    "/read-all",
    response_model=MarkAllReadResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Mark every unread notification as read",
)
async def mark_all_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MarkAllReadResponse:
    marked = await notif_svc.mark_all_read(db=db, user_id=current_user.id)
    await db.commit()
    return MarkAllReadResponse(data=MarkAllReadData(marked=marked))

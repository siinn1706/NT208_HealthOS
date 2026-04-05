from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.appointments import (
    AppointmentCreateBody,
    AppointmentListResponse,
    AppointmentResponse,
)
from app.schemas.common import ErrorResponse, PaginationMeta
from app.services import appointments as appointment_svc

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get(
    "",
    response_model=AppointmentListResponse,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="List appointments",
)
async def list_appointments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    limit: int | None = Query(default=None, ge=1, le=200),
) -> AppointmentListResponse:
    effective_per_page = limit if limit is not None else per_page
    items, total = await appointment_svc.list_appointments(
        db=db,
        user_id=current_user.id,
        page=page,
        per_page=effective_per_page,
    )
    return AppointmentListResponse(
        data=items,
        meta=PaginationMeta(page=page, per_page=effective_per_page, total=total),
    )


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="Create appointment",
)
async def create_appointment(
    body: AppointmentCreateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentResponse:
    try:
        item = await appointment_svc.create_appointment(db, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc

    await db.commit()
    return AppointmentResponse(data=item)


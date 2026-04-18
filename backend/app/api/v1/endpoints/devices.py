from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.common import ErrorResponse
from app.schemas.devices import (
    ConnectedDeviceListResponse,
    ConnectedDeviceResponse,
    DeviceConnectBody,
)
from app.services import devices as device_svc

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get(
    "",
    response_model=ConnectedDeviceListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List connected devices",
)
async def list_devices(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConnectedDeviceListResponse:
    items = await device_svc.list_devices(db, current_user.id)
    return ConnectedDeviceListResponse(data=items)


@router.post(
    "",
    response_model=ConnectedDeviceResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 400: {"model": ErrorResponse}},
    summary="Connect device",
)
async def connect_device(
    body: DeviceConnectBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConnectedDeviceResponse:
    try:
        item = await device_svc.connect_device(db, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc
    await db.commit()
    return ConnectedDeviceResponse(data=item)


@router.post(
    "/{device_id}/sync",
    response_model=ConnectedDeviceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Sync connected device",
)
async def sync_device(
    device_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConnectedDeviceResponse:
    item = await device_svc.sync_device(db, current_user.id, device_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Device not found."},
        )
    await db.commit()
    return ConnectedDeviceResponse(data=item)


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Disconnect device",
)
async def disconnect_device(
    device_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await device_svc.disconnect_device(db, current_user.id, device_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Device not found."},
        )
    await db.commit()


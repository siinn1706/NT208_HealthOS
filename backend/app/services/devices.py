from __future__ import annotations

import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ConnectedDevice, WearableProviderEnum
from app.schemas.devices import ConnectedDeviceDTO, DeviceConnectBody


PROVIDER_LABELS: dict[WearableProviderEnum, str] = {
    WearableProviderEnum.APPLE_HEALTH: "Apple Health",
    WearableProviderEnum.GOOGLE_FIT: "Google Fit",
    WearableProviderEnum.GARMIN: "Garmin Connect",
    WearableProviderEnum.FITBIT: "Fitbit",
}


def _to_provider(value: str) -> WearableProviderEnum:
    return WearableProviderEnum(value)


def _to_dto(item: ConnectedDevice) -> ConnectedDeviceDTO:
    return ConnectedDeviceDTO(
        id=item.id,
        provider=item.provider.value,
        name=PROVIDER_LABELS.get(item.provider, item.provider.value),
        model=None,
        connected=True,
        last_sync=item.last_synced_at,
        battery_pct=None,
    )


async def list_devices(db: AsyncSession, user_id: uuid.UUID) -> list[ConnectedDeviceDTO]:
    rows = (
        await db.execute(
            select(ConnectedDevice)
            .where(ConnectedDevice.user_id == user_id)
            .order_by(ConnectedDevice.connected_at.desc())
        )
    ).scalars().all()
    return [_to_dto(row) for row in rows]


async def connect_device(
    db: AsyncSession,
    user_id: uuid.UUID,
    body: DeviceConnectBody,
) -> ConnectedDeviceDTO:
    provider = _to_provider(body.provider)
    existing = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.user_id == user_id,
                ConnectedDevice.provider == provider,
            )
        )
    ).scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    if existing is None:
        item = ConnectedDevice(
            user_id=user_id,
            provider=provider,
            connected_at=now,
            last_synced_at=now,
        )
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return _to_dto(item)

    existing.connected_at = now
    if existing.last_synced_at is None:
        existing.last_synced_at = now
    await db.flush()
    await db.refresh(existing)
    return _to_dto(existing)


async def sync_device(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
) -> ConnectedDeviceDTO | None:
    item = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.id == device_id,
                ConnectedDevice.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        return None

    item.last_synced_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)


async def disconnect_device(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
) -> bool:
    item = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.id == device_id,
                ConnectedDevice.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        return False

    await db.delete(item)
    await db.flush()
    return True


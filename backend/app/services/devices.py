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
    WearableProviderEnum.HEALTH_CONNECT: "Health Connect",
}


def _to_provider(value: str) -> WearableProviderEnum:
    return WearableProviderEnum(value)


def _to_dto(item: ConnectedDevice) -> ConnectedDeviceDTO:
    # Prefer the user-set device label ("Pixel 7 — Samsung Health") when
    # present; fall back to the provider's display name for legacy rows.
    name = item.device_label or PROVIDER_LABELS.get(item.provider, item.provider.value)
    return ConnectedDeviceDTO(
        id=item.id,
        provider=item.provider.value,
        name=name,
        model=None,
        connected=True,
        last_sync=item.last_synced_at,
        battery_pct=None,
        device_label=item.device_label,
        external_account_id=item.external_account_id,
        scopes=item.scopes,
        last_sync_status=item.last_sync_status,
        last_sync_error=item.last_sync_error,
        last_sync_count=item.last_sync_count,
        last_attempted_at=item.last_attempted_at,
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
    """Idempotent connect — same (user, provider, external_account_id) reuses
    the existing row rather than creating a duplicate. Health Connect uses
    `external_account_id` to disambiguate between source apps; legacy
    providers leave it NULL and dedupe purely on (user, provider)."""
    provider = _to_provider(body.provider)
    external_account_id = body.external_account_id

    # Match the table-level uniqueness constraint exactly so we never
    # surprise-409 a user who reconnected after a permission re-grant.
    if external_account_id is not None:
        match_clause = (
            ConnectedDevice.user_id == user_id,
            ConnectedDevice.provider == provider,
            ConnectedDevice.external_account_id == external_account_id,
        )
    else:
        match_clause = (
            ConnectedDevice.user_id == user_id,
            ConnectedDevice.provider == provider,
            ConnectedDevice.external_account_id.is_(None),
        )
    existing = (
        await db.execute(select(ConnectedDevice).where(*match_clause))
    ).scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    scopes = body.scopes if body.scopes else None
    # The granted scopes determine the initial sync status: zero scopes
    # surface as `permission_denied` so the UI can show the
    # "We need at least Steps to import data" empty state immediately.
    initial_status = "ok" if scopes else (
        "permission_denied" if provider == WearableProviderEnum.HEALTH_CONNECT else None
    )

    if existing is None:
        item = ConnectedDevice(
            user_id=user_id,
            provider=provider,
            external_account_id=external_account_id,
            device_label=body.device_label,
            scopes=scopes,
            last_sync_status=initial_status,
            connected_at=now,
            last_synced_at=None,
        )
        db.add(item)
        await db.flush()
        await db.refresh(item)
        return _to_dto(item)

    existing.connected_at = now
    if body.device_label is not None:
        existing.device_label = body.device_label
    if scopes is not None:
        existing.scopes = scopes
        # Re-grant clears `permission_denied` (we DO have permissions
        # again) but does NOT preemptively flip to "ok" — that would be
        # dishonest before the next sync proves it works. Use "pending"
        # so the UI can render a neutral "connected, waiting on first
        # sync" state instead of a green check. (Code review §M5.)
        if existing.last_sync_status == "permission_denied":
            existing.last_sync_status = "pending"
    elif existing.scopes is None and provider == WearableProviderEnum.HEALTH_CONNECT:
        existing.last_sync_status = "permission_denied"
    await db.flush()
    await db.refresh(existing)
    return _to_dto(existing)


async def sync_device(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
) -> ConnectedDeviceDTO | None:
    """Legacy sync stub — only bumps `last_attempted_at`. Real ingestion
    for Health Connect happens via `POST /v1/devices/{id}/ingest`, driven
    by the mobile app. Other providers (Garmin/Fitbit/etc.) remain stubs
    until their respective OAuth flows are wired in."""
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

    now = datetime.datetime.now(datetime.timezone.utc)
    item.last_attempted_at = now
    item.last_synced_at = now
    await db.flush()
    await db.refresh(item)
    return _to_dto(item)


async def update_permissions(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    new_scopes: list[str],
) -> tuple[ConnectedDeviceDTO | None, str | None]:
    """Replace the device's `scopes` JSON with the currently-granted set.

    Used by the mobile foreground hook to reflect out-of-band permission
    changes (user revoked or re-granted in Android Settings). Returns the
    DTO and a "transition" code so the endpoint can pick the right audit
    event:

      * `revoked`        — granted set shrunk vs prior; status -> `permission_denied`
      * `re_granted`     — granted set was empty/denied and is now populated; status -> `ok`
      * `unchanged`      — same set as before; status untouched
      * `still_denied`   — empty incoming and was already denied; no change
      * None when the device row does not exist for this user
    """
    item = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.id == device_id,
                ConnectedDevice.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        return None, None

    prior_scopes: set[str] = set(item.scopes or [])
    incoming = set(new_scopes)
    transition: str
    if not incoming and not prior_scopes:
        transition = "still_denied"
    elif not incoming and prior_scopes:
        # Full revocation.
        transition = "revoked"
        item.scopes = []
        item.last_sync_status = "permission_denied"
    elif incoming and not prior_scopes:
        # Re-granted from a denied state.
        transition = "re_granted"
        item.scopes = sorted(incoming)
        item.last_sync_status = "ok"
        item.last_sync_error = None
    elif incoming != prior_scopes:
        # Partial change — could be a revoke of some types, a grant of
        # others, or both.
        item.scopes = sorted(incoming)
        if incoming < prior_scopes:
            transition = "revoked"
            # Don't blanket "permission_denied" if the user still has SOME
            # scopes — surface as `partial` so the next sync writes a real
            # status. The mobile UI distinguishes these via the scopes list.
            item.last_sync_status = "partial"
        else:
            transition = "re_granted"
            item.last_sync_status = "ok"
            item.last_sync_error = None
    else:
        transition = "unchanged"

    await db.flush()
    await db.refresh(item)
    return _to_dto(item), transition


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


from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.metrics import record_health_sync_outcome, record_idempotency_outcome
from app.core.rate_limit import user_rate_limiter
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.audit import AuditEventTypeEnum
from app.models.core import ConnectedDevice, User, WearableProviderEnum
from app.schemas.common import ErrorResponse
from app.schemas.devices import (
    ConnectedDeviceListResponse,
    ConnectedDeviceResponse,
    DeviceConnectBody,
    DevicePermissionsBody,
)
from app.schemas.sync import (
    HealthIngestBatch,
    HealthIngestResponse,
    HealthIngestResult,
    SyncStateListResponse,
    SyncStateUpdateBody,
)
from app.services import devices as device_svc
from app.services import health_sync as sync_svc
from app.services import idempotency as idem_svc
from app.services.audit import audit
from app.services.idempotency import IdempotencyOutcome, build_scoped_ingest_key
from app.services.wearable_sync.ws_publish import publish_vitals_updated

router = APIRouter(prefix="/devices", tags=["Devices"])

# 6 requests / minute / USER comfortably covers manual sync + foreground
# auto-sync + occasional bootstrap re-pulls. Per-user (not per-IP) so
# users behind shared NAT (e.g. school wifi) don't contend with each
# other for the same budget. An attacker flooding this endpoint with
# their own credentials can't blow away anyone else's data.
_rate_limit_ingest = user_rate_limiter(
    max_requests=6, window_seconds=60, route_key="hc.ingest"
)
_INGEST_BODY_LIMIT_BYTES = 256 * 1024  # 256 KiB hard cap
_SYNC_STATE_BODY_LIMIT_BYTES = 64 * 1024  # token-only endpoint cap


async def _enforce_sync_state_body_limit(request: Request) -> None:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            if int(content_length) > _SYNC_STATE_BODY_LIMIT_BYTES:
                raise ApiException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    code="PAYLOAD_TOO_LARGE",
                    message="Sync-state payload exceeds 64 KiB.",
                )
        except ValueError:
            pass

    raw_body = await request.body()
    if len(raw_body) > _SYNC_STATE_BODY_LIMIT_BYTES:
        raise ApiException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            code="PAYLOAD_TOO_LARGE",
            message="Sync-state payload exceeds 64 KiB.",
        )


async def _load_user_device(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
) -> ConnectedDevice:
    """Resolve a ConnectedDevice that belongs to `user_id`, or 404.

    Centralized so the four sync routes share the same not-found shape and
    so we never accidentally return another user's device by `id` alone.
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
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Device not found.",
        )
    return item


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
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message=str(exc),
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
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Device not found.",
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
    request: Request,
) -> None:
    # Capture the device first so we can write a coherent audit event
    # ("which provider were they disconnecting?") before the row is gone.
    device = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.id == device_id,
                ConnectedDevice.user_id == current_user.id,
            )
        )
    ).scalar_one_or_none()
    if device is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Device not found.",
        )
    provider_was = device.provider
    deleted = await device_svc.disconnect_device(db, current_user.id, device_id)
    if not deleted:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Device not found.",
        )
    if provider_was == WearableProviderEnum.HEALTH_CONNECT:
        await audit(
            db,
            AuditEventTypeEnum.HEALTH_CONNECT_DISCONNECTED,
            current_user.id,
            request,
            details={"device_id": str(device_id)},
        )
    elif provider_was == WearableProviderEnum.GOOGLE_HEALTH:
        # Distinct event so the security log can tell the on-device
        # HEALTH_CONNECT_DISCONNECTED (user revoked locally on phone)
        # apart from the server-side OAuth revocation handled by
        # `device_svc.disconnect_device`.
        await audit(
            db,
            AuditEventTypeEnum.WEARABLE_OAUTH_DISCONNECTED,
            current_user.id,
            request,
            details={"device_id": str(device_id), "provider": "google_health"},
        )
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Health Connect sync — mobile-only batch ingestion + per-record-type tokens
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/{device_id}/ingest",
    response_model=HealthIngestResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
    summary="Ingest a Health Connect batch",
    dependencies=[Depends(_rate_limit_ingest)],
)
async def ingest_health_data(
    device_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> HealthIngestResponse:
    """Mobile orchestrator posts a batch of HC records (with the new
    changesTokens to persist) and gets back per-row counts.

    Idempotency-Key is **required** — same key replays return the same
    envelope so a network blip between the response and the device
    persisting the new token does not cause duplicate ingests.
    """
    # ── Body cap (defense in depth on top of any reverse-proxy limit) ──
    if content_length is not None:
        try:
            if int(content_length) > _INGEST_BODY_LIMIT_BYTES:
                raise ApiException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    code="PAYLOAD_TOO_LARGE",
                    message="Ingest batch exceeds 256 KiB.",
                )
        except ValueError:
            pass

    raw_body = await request.body()
    if len(raw_body) > _INGEST_BODY_LIMIT_BYTES:
        raise ApiException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            code="PAYLOAD_TOO_LARGE",
            message="Ingest batch exceeds 256 KiB.",
        )

    # ── Idempotency-Key (REQUIRED on this endpoint) ────────────────────
    idem_key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
    if not idem_key:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="IDEMPOTENCY_KEY_REQUIRED",
            message="POST /devices/{id}/ingest requires an Idempotency-Key header.",
        )

    idem_scope = "hc.ingest"
    # Scope the Redis key to (user, device, body-hash) so two users
    # presenting the same Idempotency-Key header cannot cross-replay each
    # other's data and re-posting a different body always gets a fresh slot.
    scoped_key = build_scoped_ingest_key(current_user.id, device_id, raw_body)
    idem_result = await idem_svc.acquire_or_wait(redis, scoped_key, idem_scope)
    record_idempotency_outcome(idem_scope, idem_result.outcome.value)
    if idem_result.outcome == IdempotencyOutcome.REPLAY and idem_result.payload is not None:
        record_health_sync_outcome("health_connect", "replay")
        return HealthIngestResponse.model_validate(idem_result.payload)
    if idem_result.outcome == IdempotencyOutcome.CONFLICT:
        raise ApiException(
            status_code=status.HTTP_409_CONFLICT,
            code="IDEMPOTENT_INFLIGHT",
            message=(
                "A previous ingest with this Idempotency-Key is still being "
                "processed. Retry in a moment."
            ),
        )

    # ── Parse + validate the body BEFORE hitting the DB ──────────────
    # Catches malformed payloads early so we don't burn a SELECT on a
    # garbage request, and ensures Pydantic 422 wins over the device-not-
    # found 404 when both apply (clearer diagnostics for the client).
    import json as _json
    try:
        body_json = _json.loads(raw_body) if raw_body else {}
    except Exception as exc:
        await idem_svc.release(redis, scoped_key, idem_scope)
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_JSON",
            message="Body must be valid JSON.",
        ) from exc

    try:
        batch = HealthIngestBatch.model_validate(body_json)
    except Exception as exc:
        await idem_svc.release(redis, scoped_key, idem_scope)
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_FAILED",
            message=str(exc),
        ) from exc

    # ── Resolve the device (404 if it doesn't belong to the caller) ──
    device = await _load_user_device(db, current_user.id, device_id)
    try:
        batch = sync_svc.validate_ingest_batch(device, batch)
    except ValueError as exc:
        await idem_svc.release(redis, scoped_key, idem_scope)
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_FAILED",
            message=str(exc),
        ) from exc

    try:
        # `commit=False` defers durability to the explicit `db.commit()`
        # at the bottom — see code-review §M4. Without that, the audit
        # helpers' implicit commits made the "single transaction"
        # guarantee for rows + tokens cosmetic.
        await audit(
            db,
            AuditEventTypeEnum.HEALTH_DATA_SYNC_STARTED,
            current_user.id,
            request,
            details={
                "device_id": str(device_id),
                "record_count": len(batch.records),
            },
            commit=False,
        )

        try:
            result: HealthIngestResult = await sync_svc.upsert_batch(
                db, current_user.id, device, batch
            )
        except Exception as exc:
            # Failure path — record metrics + audit, mark device error,
            # release idem slot, and surface a 500.
            record_health_sync_outcome("health_connect", "error")
            await sync_svc.mark_failed(
                db, device, list(batch.next_changes_tokens.keys()), "INGEST_FAILED"
            )
            await audit(
                db,
                AuditEventTypeEnum.HEALTH_DATA_SYNC_FAILED,
                current_user.id,
                request,
                details={"device_id": str(device_id), "error": "INGEST_FAILED"},
                commit=False,
            )
            await db.commit()  # persist failure state in one shot
            await idem_svc.release(redis, scoped_key, idem_scope)
            raise ApiException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                code="INGEST_FAILED",
                message="Ingest failed.",
            ) from exc

        await audit(
            db,
            AuditEventTypeEnum.HEALTH_DATA_SYNC_COMPLETED,
            current_user.id,
            request,
            details={
                "device_id": str(device_id),
                "inserted": result.inserted,
                "updated": result.updated,
                "deleted": result.deleted,
                "skipped": result.skipped,
                "error_count": len(result.errors),
            },
            commit=False,
        )

        # Single commit for: started audit + upsert rows + token state
        # + completed audit. If anything above raised mid-flight the
        # whole transaction rolls back together.
        await db.commit()

        # WS push happens after commit — never before — so the dashboard
        # refresh triggered by the event sees committed data.
        await publish_vitals_updated(
            current_user.id,
            source="health_connect",
            count=result.inserted + result.updated + result.deleted,
        )

        record_health_sync_outcome(
            "health_connect", "partial" if result.errors else "ok"
        )
        envelope = HealthIngestResponse(data=result)
        await idem_svc.store(
            redis, scoped_key, idem_scope, envelope.model_dump(mode="json")
        )
        return envelope
    except ApiException:
        raise
    except Exception:
        # Unhandled — release the slot so retry isn't permanently stuck.
        await idem_svc.release(redis, scoped_key, idem_scope)
        raise


@router.get(
    "/{device_id}/sync-state",
    response_model=SyncStateListResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="List per-record-type sync state for a device",
)
async def get_sync_state(
    device_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SyncStateListResponse:
    """Returns the opaque changesToken per record type. Tokens are
    HC-issued and only meaningful to the device that produced them; we
    treat them as private credentials and only return them to the
    authenticated user who owns the device."""
    await _load_user_device(db, current_user.id, device_id)
    states = await sync_svc.list_sync_states(db, device_id)
    return SyncStateListResponse(data=states)


@router.put(
    "/{device_id}/sync-state",
    response_model=SyncStateListResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Replace sync-state tokens for a device",
    dependencies=[Depends(_enforce_sync_state_body_limit)],
)
async def put_sync_state(
    device_id: uuid.UUID,
    body: SyncStateUpdateBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SyncStateListResponse:
    """Standalone token PUT — used after a permission re-grant where
    the orchestrator wants to reset state without ingesting any data
    in the same call."""
    device = await _load_user_device(db, current_user.id, device_id)
    states = await sync_svc.replace_sync_states(db, device.id, body.tokens)
    await db.commit()
    return SyncStateListResponse(data=states)


@router.patch(
    "/{device_id}/permissions",
    response_model=ConnectedDeviceResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    summary="Sync the device's currently-granted permission scopes",
)
async def patch_device_permissions(
    device_id: uuid.UUID,
    body: DevicePermissionsBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConnectedDeviceResponse:
    """Mobile app pushes the currently-granted Health Connect scopes here
    after detecting an out-of-band change. The service flips
    `last_sync_status` accordingly so the UI's "Reconnect" banner can
    fire on actual revocations (vs. generic sync errors)."""
    dto, transition = await device_svc.update_permissions(
        db, current_user.id, device_id, body.scopes
    )
    if dto is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Device not found.",
        )

    if transition == "revoked":
        await audit(
            db,
            AuditEventTypeEnum.HEALTH_CONNECT_PERMISSION_REVOKED,
            current_user.id,
            request,
            details={"device_id": str(device_id), "scopes": body.scopes},
        )
    elif transition == "re_granted":
        await audit(
            db,
            AuditEventTypeEnum.HEALTH_CONNECT_PERMISSION_GRANTED,
            current_user.id,
            request,
            details={"device_id": str(device_id), "scopes": body.scopes},
        )
    # `unchanged` and `still_denied` produce no audit noise.

    await db.commit()
    return ConnectedDeviceResponse(data=dto)


"""Celery tasks for server-side Google Health sync."""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.adapters.redis_client import get_redis
from app.models.audit import AuditEventTypeEnum
from app.models.core import ConnectedDevice, WearableProviderEnum
from app.schemas.sync import HealthIngestBatch
from app.services import health_sync as sync_svc
from app.services.audit import audit
from app.services.wearable_sync import google_health
from app.services.wearable_sync.ws_publish import publish_vitals_updated
from app.services.wearable_sync.normalizer import (
    _GOOGLE_HEALTH_TYPE_MAP,
    normalize_google_health,
)
from app.services.wearable_sync.token_crypto import (
    TokenCryptoUnavailableError,
    decrypt_token,
    encrypt_token,
)
from app.tasks import celery_app

logger = logging.getLogger(__name__)

_INITIAL_BACKFILL_DAYS = 30
_TOKEN_REFRESH_BUFFER_SECONDS = 60
# A full sweep fetches ~35 data types sequentially, each able to walk up to
# _MAX_PAGES_PER_FETCH pages at _HTTP_TIMEOUT seconds — a single slow type can
# run for hundreds of seconds. The lock is renewed before every data type (see
# _renew_device_lock), so the TTL only needs to cover one type's worst case
# (50 × 10 s = 500 s) plus headroom, not the whole sweep. A crashed worker
# stops renewing and the lock lapses at the TTL rather than wedging forever.
_SYNC_LOCK_TTL_SECONDS = 600
_LOCK_RELEASE_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
"""
# Extend our own lock's TTL — but only if we still hold it. Comparing the
# token first stops us from resurrecting a lock another worker has already
# taken over after ours lapsed.
_LOCK_RENEW_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('pexpire', KEYS[1], ARGV[2])
end
return 0
"""


@dataclass(frozen=True)
class _DeviceSyncLock:
    key: str
    token: str
    redis: Any


@celery_app.task(name="app.tasks.sync_wearables.sync_google_health_all")
def sync_google_health_all() -> dict[str, int]:
    """Beat-driven fan-out. Returns a summary dict for Flower / logs."""
    return asyncio.run(_sync_all_async())


@celery_app.task(name="app.tasks.sync_wearables.sync_google_health_user")
def sync_google_health_user(connection_id: str) -> dict[str, Any]:
    """On-demand entry point used by callback and webhook paths."""
    try:
        cid = uuid.UUID(connection_id)
    except (TypeError, ValueError):
        logger.warning("sync_google_health_user: bad connection_id %r", connection_id)
        return {"status": "bad_id"}
    return asyncio.run(_sync_one_by_id_async(cid))


async def _sync_all_async() -> dict[str, int]:
    """Iterate every google_health connection sequentially."""
    devices_seen = 0
    devices_ok = 0
    devices_error = 0
    async with AsyncSessionLocal() as db:
        connections = (
            await db.execute(
                select(ConnectedDevice).where(
                    ConnectedDevice.provider == WearableProviderEnum.GOOGLE_HEALTH,
                    ConnectedDevice.refresh_token_encrypted.isnot(None),
                )
            )
        ).scalars().all()

    for connection in connections:
        devices_seen += 1
        try:
            outcome = await _sync_one_device_async(connection.id)
            if outcome.get("status") == "ok":
                devices_ok += 1
            else:
                devices_error += 1
        except Exception:  # pragma: no cover - defensive
            devices_error += 1
            logger.exception(
                "sync_google_health_all: unhandled error for connection %s",
                connection.id,
            )
    return {
        "devices_seen": devices_seen,
        "devices_ok": devices_ok,
        "devices_error": devices_error,
    }


async def _sync_one_by_id_async(connection_id: uuid.UUID) -> dict[str, Any]:
    """Thin wrapper so the Celery task shell only sees one entry point."""
    return await _sync_one_device_async(connection_id)


async def _sync_one_device_async(connection_id: uuid.UUID) -> dict[str, Any]:
    """Sync one ConnectedDevice end-to-end with a per-device lock."""
    try:
        lock = await _acquire_device_lock(connection_id)
    except Exception:
        logger.exception(
            "sync_google_health_user: failed to acquire lock for connection %s",
            connection_id,
        )
        return {"status": "error", "reason": "lock_unavailable"}
    if lock is None:
        return {"status": "skipped", "reason": "locked"}

    try:
        async with AsyncSessionLocal() as db:
            device = (
                await db.execute(
                    select(ConnectedDevice).where(ConnectedDevice.id == connection_id)
                )
            ).scalar_one_or_none()
            if device is None or device.provider != WearableProviderEnum.GOOGLE_HEALTH:
                return {"status": "skipped", "reason": "not_google_health"}
            if not device.refresh_token_encrypted:
                return {"status": "skipped", "reason": "no_refresh_token"}

            try:
                access_token = (
                    decrypt_token(device.access_token_encrypted)
                    if device.access_token_encrypted
                    else None
                )
                refresh_token = decrypt_token(device.refresh_token_encrypted)
            except TokenCryptoUnavailableError:
                logger.exception("Token decrypt failed for connection %s", device.id)
                await _mark_error(db, device, "TOKEN_DECRYPT_FAILED")
                await db.commit()
                return {"status": "error", "reason": "token_decrypt_failed"}

            now = datetime.datetime.now(datetime.timezone.utc)
            needs_refresh = (
                access_token is None
                or device.token_expires_at is None
                or device.token_expires_at
                <= now + datetime.timedelta(seconds=_TOKEN_REFRESH_BUFFER_SECONDS)
            )
            if needs_refresh:
                try:
                    access_token, refresh_token = await _refresh_and_persist(
                        db, device, refresh_token
                    )
                except google_health.GoogleHealthError as exc:
                    if exc.status_code == 400:
                        await _mark_error(db, device, "REAUTH_REQUIRED")
                        await audit(
                            db,
                            AuditEventTypeEnum.HEALTH_DATA_SYNC_FAILED,
                            device.user_id,
                            None,
                            details={
                                "connection_id": str(device.id),
                                "error": "REAUTH_REQUIRED",
                            },
                            commit=False,
                        )
                    else:
                        await _mark_error(db, device, "TOKEN_REFRESH_FAILED")
                    await db.commit()
                    return {"status": "error", "reason": "refresh_failed"}

            since = device.last_synced_at or (
                now - datetime.timedelta(days=_INITIAL_BACKFILL_DAYS)
            )
            until = now

            await audit(
                db,
                AuditEventTypeEnum.HEALTH_DATA_SYNC_STARTED,
                device.user_id,
                None,
                details={
                    "connection_id": str(device.id),
                    "provider": "google_health",
                    "since": since.isoformat(),
                },
                commit=False,
            )

            accepted_records = []
            dropped_count = 0
            for data_type in _GOOGLE_HEALTH_TYPE_MAP.keys():
                # Keep the lock fresh before each (potentially multi-page,
                # multi-second) fetch so a long sweep can't outlive its TTL
                # and let a concurrent run start syncing the same device.
                await _renew_device_lock(lock)
                try:
                    raw_records = await google_health.fetch_data(
                        access_token, data_type, since, until
                    )
                except google_health.GoogleHealthError as exc:
                    if exc.status_code == 401:
                        try:
                            access_token, refresh_token = await _refresh_and_persist(
                                db, device, refresh_token
                            )
                            raw_records = await google_health.fetch_data(
                                access_token, data_type, since, until
                            )
                        except google_health.GoogleHealthError:
                            logger.warning(
                                "Mid-sweep refresh failed for %s data_type=%s",
                                device.id,
                                data_type,
                            )
                            continue
                    else:
                        logger.warning(
                            "fetch_data failed for %s data_type=%s status=%s",
                            device.id,
                            data_type,
                            exc.status_code,
                        )
                        continue

                report = normalize_google_health(
                    raw_records, data_type=data_type, source_app="google_health"
                )
                accepted_records.extend(report.accepted)
                dropped_count += len(report.dropped)
                if report.dropped:
                    logger.info(
                        "Dropped %d %s records for connection %s",
                        len(report.dropped),
                        data_type,
                        device.id,
                    )

            if accepted_records:
                batch = HealthIngestBatch(
                    provider="google_health",
                    records=accepted_records,
                    deletions=[],
                    next_changes_tokens={},
                )
                try:
                    result = await sync_svc.upsert_batch(
                        db,
                        device.user_id,
                        device,
                        batch,
                    )
                except Exception as exc:
                    logger.exception("upsert_batch failed for connection %s", device.id)
                    await sync_svc.mark_failed(db, device, [], "UPSERT_FAILED")
                    await audit(
                        db,
                        AuditEventTypeEnum.HEALTH_DATA_SYNC_FAILED,
                        device.user_id,
                        None,
                        details={
                            "connection_id": str(device.id),
                            "error": "UPSERT_FAILED",
                        },
                        commit=False,
                    )
                    await db.commit()
                    return {"status": "error", "reason": str(exc)[:120]}
            else:
                device.last_synced_at = now
                device.last_attempted_at = now
                device.last_sync_status = "ok"
                device.last_sync_count = 0
                device.last_sync_error = None
                result = None

            await audit(
                db,
                AuditEventTypeEnum.HEALTH_DATA_SYNC_COMPLETED,
                device.user_id,
                None,
                details={
                    "connection_id": str(device.id),
                    "provider": "google_health",
                    "inserted": result.inserted if result else 0,
                    "updated": result.updated if result else 0,
                    "dropped": dropped_count,
                },
                commit=False,
            )
            await db.commit()

            # WS push after commit — same ordering guarantee as the mobile
            # ingest endpoint.
            if result is not None:
                await publish_vitals_updated(
                    device.user_id,
                    source="google_health",
                    count=result.inserted + result.updated,
                )

            return {
                "status": "ok",
                "inserted": result.inserted if result else 0,
                "updated": result.updated if result else 0,
                "dropped": dropped_count,
            }
    finally:
        await _release_device_lock(lock)


async def _refresh_and_persist(
    db,
    device: ConnectedDevice,
    refresh_token: str,
) -> tuple[str, str]:
    """Refresh the access token and persist the new ciphertext + expiry.

    Returns ``(new_access, current_refresh)``. ``current_refresh`` is the
    rotated refresh token when Google sends one, otherwise the input token.
    Callers MUST reassign their local refresh-token variable from the return
    value: a second refresh in the same sweep (mid-sweep 401) that reused a
    rotated-away token would fail with invalid_grant.
    """
    payload = await google_health.refresh_access_token(refresh_token)
    new_access = payload.get("access_token")
    if not new_access:
        raise google_health.GoogleHealthError(
            "Refresh response missing access_token.",
            status_code=500,
        )
    try:
        expires_in = int(payload.get("expires_in", 3600))
    except (TypeError, ValueError):
        expires_in = 3600
    device.access_token_encrypted = encrypt_token(new_access)
    device.token_expires_at = datetime.datetime.now(
        datetime.timezone.utc
    ) + datetime.timedelta(seconds=expires_in)
    new_refresh = payload.get("refresh_token")
    if new_refresh:
        device.refresh_token_encrypted = encrypt_token(new_refresh)
    return new_access, (new_refresh or refresh_token)


async def _acquire_device_lock(connection_id: uuid.UUID) -> _DeviceSyncLock | None:
    redis = await get_redis()
    key = f"wearable-sync:{connection_id}"
    token = uuid.uuid4().hex
    acquired = await redis.set(key, token, nx=True, ex=_SYNC_LOCK_TTL_SECONDS)
    if not acquired:
        return None
    return _DeviceSyncLock(key=key, token=token, redis=redis)


async def _release_device_lock(lock: _DeviceSyncLock) -> None:
    try:
        await lock.redis.eval(_LOCK_RELEASE_SCRIPT, 1, lock.key, lock.token)
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to release wearable sync lock %s", lock.key)


async def _renew_device_lock(lock: _DeviceSyncLock) -> None:
    """Reset the lock's TTL to a full window, but only while we still own it.

    Best-effort: a renew failure (Redis blip) just means the lock may lapse
    early, which at worst lets a duplicate sync start — the same outcome the
    lock already tolerates on the unhappy path. Never let it abort the sync.
    """
    try:
        await lock.redis.eval(
            _LOCK_RENEW_SCRIPT,
            1,
            lock.key,
            lock.token,
            str(_SYNC_LOCK_TTL_SECONDS * 1000),
        )
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to renew wearable sync lock %s", lock.key)


async def _mark_error(db, device: ConnectedDevice, code: str) -> None:
    """Set the device error fields without touching tokens."""
    now = datetime.datetime.now(datetime.timezone.utc)
    device.last_attempted_at = now
    device.last_sync_status = "error"
    device.last_sync_error = code

"""Celery tasks — Google Health (Luồng B) server-side polling.

Two tasks live here:

  * ``sync_google_health_all`` — Beat-scheduled (default every 15 min)
    sweep over every active ``connected_devices`` row with provider
    ``google_health``. Schedule entry lives in
    ``app.tasks.__init__.celery_app.conf.beat_schedule``.

  * ``sync_google_health_user`` — on-demand entry point. Used by the
    OAuth callback to kick off the initial backfill, and by the webhook
    receiver once Google Health push notifications go GA.

The actual work lives in ``_sync_one_device_async`` so both task
shells share the same control flow. We wrap in ``asyncio.run`` because
the Google Health REST client (``google_health.py``) is async — staying
async end-to-end lets us reuse one ``httpx.AsyncClient`` per call and
the existing async SQLAlchemy session pool.

This is the only place that talks to Google Health on a schedule.
Mobile Health Connect ingest (Luồng A) stays on
``POST /v1/devices/{id}/ingest`` and is not affected by anything here.
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from typing import Any

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal
from app.models.audit import AuditEventTypeEnum
from app.models.core import ConnectedDevice, WearableProviderEnum
from app.schemas.sync import HealthIngestBatch
from app.services import health_sync as sync_svc
from app.services.audit import audit
from app.services.wearable_sync import google_health
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


# How far back to reach on the first sync (when ``last_synced_at`` is
# null). 30 days matches the AGENTS doc and gives the user a meaningful
# initial chart while staying well inside Google's data retention. After
# that, we always pick up where the last successful sync left off.
_INITIAL_BACKFILL_DAYS = 30

# Buffer applied to ``token_expires_at`` before deciding to refresh.
# 60 seconds covers worst-case clock skew between our pod and Google
# without paying a refresh round-trip on every sync when the token is
# still mostly fresh.
_TOKEN_REFRESH_BUFFER_SECONDS = 60


# ─────────────────────────────────────────────────────────────────────
# Celery task shells
# ─────────────────────────────────────────────────────────────────────


@celery_app.task(name="app.tasks.sync_wearables.sync_google_health_all")
def sync_google_health_all() -> dict[str, int]:
    """Beat-driven fan-out. Returns a summary dict for Flower / logs."""
    return asyncio.run(_sync_all_async())


@celery_app.task(name="app.tasks.sync_wearables.sync_google_health_user")
def sync_google_health_user(connection_id: str) -> dict[str, Any]:
    """On-demand entry point — called from the OAuth callback for the
    initial backfill, and from the webhook receiver once push is GA."""
    try:
        cid = uuid.UUID(connection_id)
    except (TypeError, ValueError):
        logger.warning("sync_google_health_user: bad connection_id %r", connection_id)
        return {"status": "bad_id"}
    return asyncio.run(_sync_one_by_id_async(cid))


# ─────────────────────────────────────────────────────────────────────
# Async implementation
# ─────────────────────────────────────────────────────────────────────


async def _sync_all_async() -> dict[str, int]:
    """Iterate every google_health connection sequentially.

    Sequential (not parallel) on purpose: one Beat tick already runs in
    its own worker, parallelism comes from worker count rather than
    in-task gather(). Keeping it serial means token-refresh races are
    impossible — two concurrent refreshes for the same connection
    would have one overwrite the other's freshly-issued tokens.
    """
    devices_seen = 0
    devices_ok = 0
    devices_error = 0
    async with AsyncSessionLocal() as db:
        connections = (
            await db.execute(
                select(ConnectedDevice).where(
                    ConnectedDevice.provider == WearableProviderEnum.GOOGLE_HEALTH,
                    # `refresh_token_encrypted` is the load-bearing column —
                    # without it we can't refresh, and the OAuth callback
                    # always sets it. Skipping NULL rows guards against
                    # half-migrated state from earlier dev work.
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
        except Exception:  # pragma: no cover — defensive
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
    """Sync one ConnectedDevice end-to-end.

    Each session is short-lived so a long sweep doesn't pin a connection
    from the pool for the whole iteration. Per-connection sessions also
    isolate transactional failures: a bad row only rolls back its own
    transaction.
    """
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

        # ── Decrypt tokens ────────────────────────────────────────────
        try:
            access_token = (
                decrypt_token(device.access_token_encrypted)
                if device.access_token_encrypted
                else None
            )
            refresh_token = decrypt_token(device.refresh_token_encrypted)
        except TokenCryptoUnavailableError:
            # Operator misconfigured FERNET_KEY or the key rotated. Surface
            # loudly via the device row so the UI prompts re-consent; we
            # can't recover automatically.
            logger.exception("Token decrypt failed for connection %s", device.id)
            await _mark_error(db, device, "TOKEN_DECRYPT_FAILED")
            await db.commit()
            return {"status": "error", "reason": "token_decrypt_failed"}

        # ── Refresh if needed ─────────────────────────────────────────
        now = datetime.datetime.now(datetime.timezone.utc)
        needs_refresh = (
            access_token is None
            or device.token_expires_at is None
            or device.token_expires_at
            <= now + datetime.timedelta(seconds=_TOKEN_REFRESH_BUFFER_SECONDS)
        )
        if needs_refresh:
            try:
                access_token = await _refresh_and_persist(db, device, refresh_token)
            except google_health.GoogleHealthError as exc:
                # `invalid_grant` (400) means the user revoked from their
                # Google account — there's no token to refresh anymore,
                # the UI must prompt re-consent. Anything else (5xx,
                # timeouts) is transient; bump the error and retry next
                # tick rather than wiping state.
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

        # ── Fetch + normalize each data type ─────────────────────────
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
        # Iterate every data type the normalizer knows. Google Health
        # returns an empty list for types the user didn't grant — no
        # need to pre-filter against `oauth_scopes` (and doing so would
        # require maintaining a second scope → data_type table).
        for data_type in _GOOGLE_HEALTH_TYPE_MAP.keys():
            try:
                raw_records = await google_health.fetch_data(
                    access_token, data_type, since, until
                )
            except google_health.GoogleHealthError as exc:
                if exc.status_code == 401:
                    # Access token expired mid-sweep (rare — usually the
                    # pre-flight refresh catches this). Refresh once and
                    # retry the *same* data_type, then continue the loop.
                    try:
                        access_token = await _refresh_and_persist(
                            db, device, refresh_token
                        )
                        raw_records = await google_health.fetch_data(
                            access_token, data_type, since, until
                        )
                    except google_health.GoogleHealthError:
                        logger.warning(
                            "Mid-sweep refresh failed for %s data_type=%s",
                            device.id, data_type,
                        )
                        continue
                else:
                    # Non-auth failure for a single data_type — log and
                    # keep going. A flaky upstream for "stress_score"
                    # shouldn't kill the sync for "heart_rate".
                    logger.warning(
                        "fetch_data failed for %s data_type=%s status=%s",
                        device.id, data_type, exc.status_code,
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
                    len(report.dropped), data_type, device.id,
                )

        # ── Upsert via the existing service ──────────────────────────
        if accepted_records:
            batch = HealthIngestBatch(
                provider="google_health",
                records=accepted_records,
                deletions=[],
                next_changes_tokens={},
            )
            try:
                # `upsert_batch` stamps last_synced_at / last_sync_count /
                # last_sync_status AND fires `publish_vitals_updated` with
                # the correct `ws_source` tag. We don't double-emit here.
                result = await sync_svc.upsert_batch(
                    db, device.user_id, device, batch,
                    ws_source="google_health",
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
            # Nothing to write, but we still want the device row to
            # reflect a successful empty sync — otherwise `last_synced_at`
            # never advances and tomorrow's sweep re-pulls 30 days again.
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

        return {
            "status": "ok",
            "inserted": result.inserted if result else 0,
            "updated": result.updated if result else 0,
            "dropped": dropped_count,
        }


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────


async def _refresh_and_persist(
    db,
    device: ConnectedDevice,
    refresh_token: str,
) -> str:
    """Refresh the access token and persist the new ciphertext + expiry.

    Returns the fresh plaintext access token so the caller can use it
    immediately. Does NOT commit — the caller bundles this with any
    subsequent row writes inside one transaction.

    Google may rotate the refresh_token; if it does, we re-encrypt and
    persist the new one. Per Google's docs the refresh_token field is
    often omitted from the response — when that happens we keep the
    existing one untouched.
    """
    payload = await google_health.refresh_access_token(refresh_token)
    new_access = payload.get("access_token")
    if not new_access:
        raise google_health.GoogleHealthError(
            "Refresh response missing access_token.",
            status_code=500,
        )
    expires_in = int(payload.get("expires_in", 3600))
    device.access_token_encrypted = encrypt_token(new_access)
    device.token_expires_at = datetime.datetime.now(
        datetime.timezone.utc
    ) + datetime.timedelta(seconds=expires_in)
    new_refresh = payload.get("refresh_token")
    if new_refresh:
        device.refresh_token_encrypted = encrypt_token(new_refresh)
    return new_access


async def _mark_error(db, device: ConnectedDevice, code: str) -> None:
    """Set the device error fields without touching tokens.

    Mirrors ``health_sync.mark_failed`` but skips the per-record-type
    `device_sync_state` machinery — Google Health doesn't issue
    HC-style changes tokens, so there's nothing per-record-type to
    record a failure against.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    device.last_attempted_at = now
    device.last_sync_status = "error"
    device.last_sync_error = code

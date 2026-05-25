"""Wearable OAuth — Google Health (Luồng B) endpoints.

Three endpoints under ``/v1/wearables/google``:

  * ``POST /connect``   — mint the consent URL the BFF redirects to.
  * ``GET  /callback``  — Google sends the user back here with a code.
  * ``POST /webhook``   — Google push notifications (stub until GA).

Disconnect / list / mobile-ingest deliberately do NOT live here:

  * ``DELETE /v1/devices/{id}`` already covers disconnect — it just
    needs to revoke the Google token when the device row is a
    ``google_health`` provider. That extension lives in
    ``app.services.devices.disconnect_device``.

  * ``GET /v1/devices`` already lists all connected wearables.

  * ``POST /v1/devices/{id}/ingest`` continues to be the only mobile
    Health Connect ingest endpoint — there's no parallel
    ``/wearables/sync`` because it would be 100 %% redundant.

Keeping the surface area minimal here means the dashboard only learns
ONE pattern for connection management, regardless of provider.
"""
from __future__ import annotations

import datetime
import hashlib
import hmac
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.core.security import get_current_user
from app.models.audit import AuditEventTypeEnum
from app.models.core import ConnectedDevice, User, WearableProviderEnum
from app.schemas.common import ErrorResponse
from app.schemas.devices import ConnectedDeviceDTO, ConnectedDeviceResponse
from app.services import devices as device_svc
from app.services.audit import audit
from app.services.wearable_sync import google_health, oauth_state
from app.services.wearable_sync.token_crypto import (
    TokenCryptoUnavailableError,
    encrypt_token,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wearables", tags=["Wearables"])


# ─────────────────────────────────────────────────────────────────────
# /connect — mint the consent URL
# ─────────────────────────────────────────────────────────────────────


class GoogleConnectResponse(BaseModel):
    """Body of POST /wearables/google/connect.

    The FE does ``window.location.href = authorization_url`` so the user
    leaves the SPA and lands on Google's consent screen. The signed
    ``state`` is embedded in the URL — callers never see it directly.
    """

    authorization_url: str


@router.post(
    "/google/connect",
    response_model=GoogleConnectResponse,
    responses={
        401: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Begin Google Health OAuth — return consent URL",
)
async def google_connect(
    current_user: Annotated[User, Depends(get_current_user)],
    redis=Depends(get_redis),
) -> GoogleConnectResponse:
    """Return a fresh Google OAuth consent URL bound to ``current_user``.

    The URL embeds a one-time signed state (``oauth_state.mint_state``)
    so the callback can prove the round-trip was initiated by THIS user
    in THIS browser session.  The nonce is stored in Redis with a 10-minute
    TTL; ``consume_state`` atomically removes it so any replay of the same
    state URL is rejected even before the JWT expires.
    """
    state = await oauth_state.mint_state(redis, current_user.id)
    try:
        url = google_health.build_oauth_url(state)
    except google_health.GoogleHealthError as exc:
        # Credentials missing — operator-fixable, not user-fixable.
        # 503 (not 500) so the FE can show a "Coming soon" message
        # rather than a generic crash dialog.
        logger.warning("Google Health connect failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "WEARABLE_NOT_CONFIGURED",
                "message": "Google Health is not configured on this server.",
            },
        ) from exc
    return GoogleConnectResponse(authorization_url=url)


# ─────────────────────────────────────────────────────────────────────
# /callback — exchange code, persist tokens
# ─────────────────────────────────────────────────────────────────────


@router.get(
    "/google/callback",
    response_model=ConnectedDeviceResponse,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        409: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Google Health OAuth callback — finish the connection",
)
async def google_callback(
    request: Request,
    code: Annotated[str, Query(min_length=1, max_length=2048)],
    state: Annotated[str, Query(min_length=1, max_length=4096)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis=Depends(get_redis),
) -> ConnectedDeviceResponse:
    """Exchange the authorization ``code`` for tokens, persist a
    ``ConnectedDevice`` row, enqueue an initial backfill, and return
    the device DTO (same shape as ``POST /v1/devices``).

    The route deliberately keeps the response 200 (not a redirect): the
    BFF route handler decides whether to redirect the browser back to
    ``/dashboard/health`` — the Core BE just delivers the data.

    Failure modes:
      * Bad state / replay   → 400 (CSRF, expired link, or second use).
      * Bad code             → 400 (Google rejected the exchange).
      * Token-encrypt fails  → 503 (operator forgot ``FERNET_KEY``).
      * Unique-violation     → handled by ``device_svc`` upsert pattern.
    """
    # ── Consume state (one-time, replay-safe) ────────────────────────
    try:
        await oauth_state.consume_state(redis, state, expected_user_id=current_user.id)
    except oauth_state.OAuthStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATE", "message": str(exc)},
        ) from exc

    # ── Exchange code → tokens ──────────────────────────────────────
    try:
        tokens = await google_health.exchange_code_for_tokens(code)
    except google_health.GoogleHealthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "OAUTH_EXCHANGE_FAILED", "message": str(exc)},
        ) from exc

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = int(tokens.get("expires_in", 3600))
    granted_scope_str = tokens.get("scope") or ""
    if not access_token or not refresh_token:
        # `prompt=consent` in build_oauth_url should guarantee a
        # refresh_token. If Google returns without one anyway (e.g.
        # the user has already linked the project and Google decides
        # not to re-issue), surface a clear error rather than persist
        # a half-broken connection.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "OAUTH_INCOMPLETE",
                "message": (
                    "Google did not return both access and refresh tokens. "
                    "Disconnect existing access at https://myaccount.google.com/permissions "
                    "and retry."
                ),
            },
        )

    # ── Fetch user profile so we know which Google account to bind ──
    try:
        profile = await google_health.fetch_user_profile(access_token)
    except google_health.GoogleHealthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "OAUTH_PROFILE_FAILED", "message": str(exc)},
        ) from exc
    google_sub = str(profile.get("sub") or "").strip()
    if not google_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "OAUTH_PROFILE_FAILED",
                "message": "Google profile is missing a stable subject id.",
            },
        )
    duplicate_owner = (
        await db.execute(
            select(ConnectedDevice.user_id).where(
                ConnectedDevice.provider == WearableProviderEnum.GOOGLE_HEALTH,
                ConnectedDevice.external_account_id == google_sub,
                ConnectedDevice.user_id != current_user.id,
            )
        )
    ).scalar_one_or_none()
    if duplicate_owner is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ACCOUNT_ALREADY_LINKED",
                "message": (
                    "This Google Health account is already linked to another user."
                ),
            },
        )

    # ── Encrypt tokens before any DB write ──────────────────────────
    try:
        access_ciphertext = encrypt_token(access_token)
        refresh_ciphertext = encrypt_token(refresh_token)
    except TokenCryptoUnavailableError as exc:
        # FERNET_KEY misconfigured — refuse to persist plaintext. 503
        # (not 500) signals operator-fixable; 500 would imply a code
        # bug worth paging on.
        logger.error("FERNET_KEY missing — cannot persist Google Health tokens")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "WEARABLE_NOT_CONFIGURED",
                "message": "Server is not configured to store wearable tokens.",
            },
        ) from exc

    # ── Upsert the ConnectedDevice row ──────────────────────────────
    now = datetime.datetime.now(datetime.timezone.utc)
    token_expires_at = now + datetime.timedelta(seconds=expires_in)
    granted_scopes = sorted({s for s in granted_scope_str.split() if s})

    existing = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.user_id == current_user.id,
                ConnectedDevice.provider == WearableProviderEnum.GOOGLE_HEALTH,
                ConnectedDevice.external_account_id == google_sub,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        device = ConnectedDevice(
            user_id=current_user.id,
            provider=WearableProviderEnum.GOOGLE_HEALTH,
            external_account_id=google_sub,
            device_label="Google Health",
            access_token_encrypted=access_ciphertext,
            refresh_token_encrypted=refresh_ciphertext,
            token_expires_at=token_expires_at,
            oauth_scopes=granted_scopes,
            # "pending" — connected, waiting on first sync to prove it
            # works. Mirrors the Health Connect "re-grant" transition
            # in devices.connect_device, intentionally honest.
            last_sync_status="pending",
            connected_at=now,
        )
        db.add(device)
        await db.flush()
    else:
        existing.access_token_encrypted = access_ciphertext
        existing.refresh_token_encrypted = refresh_ciphertext
        existing.token_expires_at = token_expires_at
        existing.oauth_scopes = granted_scopes
        existing.device_label = "Google Health"
        existing.last_sync_status = "pending"
        existing.last_sync_error = None
        existing.connected_at = now
        device = existing

    await audit(
        db,
        AuditEventTypeEnum.WEARABLE_OAUTH_CONNECTED,
        current_user.id,
        request,
        details={
            "provider": "google_health",
            "device_id": str(device.id),
            "scopes_count": len(granted_scopes),
        },
        commit=False,
    )
    await db.commit()
    await db.refresh(device)

    # ── Kick off the initial backfill (best-effort) ─────────────────
    # If Celery is unreachable we still return success — the next Beat
    # tick will sweep this row anyway. Importing the task lazily keeps
    # the OAuth endpoint testable without a Celery broker.
    try:
        from app.tasks.sync_wearables import sync_google_health_user

        sync_google_health_user.delay(str(device.id))
    except Exception:  # pragma: no cover — defensive
        logger.exception(
            "Failed to enqueue initial Google Health sync for device %s",
            device.id,
        )

    return ConnectedDeviceResponse(data=_device_to_dto(device))


# ─────────────────────────────────────────────────────────────────────
# /webhook — Google Health push notifications (stub-ready)
# ─────────────────────────────────────────────────────────────────────


@router.post(
    "/google/webhook",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Google Health push-notification receiver",
)
async def google_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Receive a push from Google Health and enqueue an on-demand sync.

    Google Health's webhook contract is not yet GA (see
    ``google_health.register_webhook`` — it returns ``None``). This
    endpoint is registered now so deployment can flip on push delivery
    later without a code change. Until Google starts calling it, the
    only sync path is the 15-minute Beat poller.

    Auth model: HMAC-SHA256 over the raw body using
    ``settings.google_health_webhook_secret``. NEVER use JWT here —
    Google won't carry a user JWT.

    Body shape (when Google ships it): we expect a JSON envelope
    carrying the affected Google ``sub`` (the same ``external_account_id``
    we persisted at OAuth time). We look up the matching
    ``ConnectedDevice`` and enqueue ``sync_google_health_user`` for it.
    """
    secret = settings.google_health_webhook_secret
    if not secret:
        # No secret configured → reject everything. Better than silently
        # accepting unsigned pushes and trusting the payload's sub field.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "WEBHOOK_NOT_CONFIGURED",
                "message": "Google Health webhooks are not enabled on this server.",
            },
        )

    raw_body = await request.body()
    sig = request.headers.get("X-Goog-Signature", "")
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        # Don't log the signature — that would help an attacker confirm
        # they're close to a valid value. Generic 401, no detail.
        logger.warning("Google webhook signature mismatch")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_SIGNATURE", "message": "Bad webhook signature."},
        )

    # Parse the body just enough to extract the affected Google sub.
    # Tolerant of the still-evolving Google shape: try a couple of
    # common locations rather than locking to one before push GAs.
    import json as _json
    try:
        payload = _json.loads(raw_body) if raw_body else {}
    except Exception:
        payload = {}
    google_sub = (
        payload.get("sub")
        or payload.get("user_id")
        or payload.get("data", {}).get("sub")
    )
    if not google_sub:
        # Nothing actionable, but the signature was valid — so this is a
        # real Google push we just don't know how to interpret yet.
        # Return 204 so Google doesn't retry endlessly.
        logger.info("Google webhook received with no actionable subject")
        return

    device = (
        await db.execute(
            select(ConnectedDevice).where(
                ConnectedDevice.provider == WearableProviderEnum.GOOGLE_HEALTH,
                ConnectedDevice.external_account_id == str(google_sub),
            )
        )
    ).scalar_one_or_none()
    if device is None:
        logger.info(
            "Google webhook for unknown sub %s — ignored", str(google_sub)[:32]
        )
        return

    try:
        from app.tasks.sync_wearables import sync_google_health_user

        sync_google_health_user.delay(str(device.id))
    except Exception:  # pragma: no cover — defensive
        logger.exception(
            "Failed to enqueue webhook-triggered sync for device %s", device.id
        )
    return


# ─────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────


def _device_to_dto(device: ConnectedDevice) -> ConnectedDeviceDTO:
    """Local DTO build — keeps the response shape consistent with
    ``device_svc._to_dto`` without exposing OAuth ciphertext."""
    label = device.device_label or "Google Health"
    return ConnectedDeviceDTO(
        id=device.id,
        provider=device.provider.value,
        name=label,
        model=None,
        connected=True,
        last_sync=device.last_synced_at,
        battery_pct=None,
        device_label=device.device_label,
        external_account_id=device.external_account_id,
        scopes=device.oauth_scopes,
        last_sync_status=device.last_sync_status,
        last_sync_error=device.last_sync_error,
        last_sync_count=device.last_sync_count,
        last_attempted_at=device.last_attempted_at,
    )

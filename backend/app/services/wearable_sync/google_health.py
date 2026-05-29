"""Google Health API client — pure functions, no DB access.

Wraps the standard Google OAuth 2.0 flow plus the Google Health REST
API. The caller is responsible for persisting tokens (via
``ConnectedDevice`` + ``token_crypto``) and for invoking ``fetch_data``
on the schedule it prefers (Celery Beat at 15-minute intervals, or
on-demand from the OAuth callback).

The 'Google Health API' here is the new 2024 unified API documented at
https://developers.google.com/health — distinct from (and the eventual
replacement for) the legacy Google Fit Fitness API and the standalone
Fitbit Web API. We do **not** target either of those.

API surface marked TODO below is intentionally explicit: as of
implementation time some endpoint paths and the webhook subscription
mechanism were still in flux per Google's docs. The caller's contract
(``fetch_data`` returns a list of dicts shaped like raw HC records
the normalizer can consume) is stable regardless of which concrete
REST shape Google ships.
"""
from __future__ import annotations

import datetime
import logging
import urllib.parse
from typing import Any, Final

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Google OAuth 2.0 endpoints (stable, not specific to Health API) ──
_OAUTH_AUTH_URL: Final[str] = "https://accounts.google.com/o/oauth2/v2/auth"
_OAUTH_TOKEN_URL: Final[str] = "https://oauth2.googleapis.com/token"
_OAUTH_REVOKE_URL: Final[str] = "https://oauth2.googleapis.com/revoke"
_OAUTH_USERINFO_URL: Final[str] = "https://openidconnect.googleapis.com/v1/userinfo"

# ── Google Health REST base. Documented at developers.google.com/health.
# Pinned to v1 to avoid silent breakage if Google publishes v2 with
# different request/response shapes. ──
_HEALTH_API_BASE: Final[str] = "https://health.googleapis.com/v1"

# ── Scopes requested at consent time. Take the maximum set the spec
# enumerates so a single grant covers every metric the normalizer maps.
# Reference: https://developers.google.com/health/scopes
# Per spec §3.5: activity, heart rate, sleep, body composition, SpO2,
# skin temp, breathing, stress, cardio fitness, ECG. ──
_DEFAULT_SCOPES: Final[tuple[str, ...]] = (
    "openid",
    "email",
    "profile",
    # Activity
    "https://www.googleapis.com/auth/health.activity.read",
    "https://www.googleapis.com/auth/health.exercise.read",
    # Cardiovascular
    "https://www.googleapis.com/auth/health.heart_rate.read",
    "https://www.googleapis.com/auth/health.blood_pressure.read",
    "https://www.googleapis.com/auth/health.heart_rate_variability.read",
    # Sleep & recovery
    "https://www.googleapis.com/auth/health.sleep.read",
    # Body composition
    "https://www.googleapis.com/auth/health.body_measurement.read",
    "https://www.googleapis.com/auth/health.weight.read",
    # Respiratory & oximetry
    "https://www.googleapis.com/auth/health.oxygen_saturation.read",
    "https://www.googleapis.com/auth/health.respiratory_rate.read",
    # Temperature
    "https://www.googleapis.com/auth/health.body_temperature.read",
    "https://www.googleapis.com/auth/health.skin_temperature.read",
    # Misc
    "https://www.googleapis.com/auth/health.blood_glucose.read",
    "https://www.googleapis.com/auth/health.hydration.read",
    "https://www.googleapis.com/auth/health.stress.read",
    "https://www.googleapis.com/auth/health.cardio_fitness.read",
)

# Network timeout for every upstream call. Google's APIs are usually
# fast, but we wrap an explicit cap so a stuck request can't pin a
# Celery worker. 10 s matches the auth.py httpx pattern.
_HTTP_TIMEOUT: Final[float] = 10.0


class GoogleHealthError(RuntimeError):
    """Raised on any non-recoverable failure talking to Google Health.

    The caller (OAuth endpoint, Celery task) should catch this and
    surface a user-facing CTA — typically 'Re-connect Google Health'
    when the failure was an auth issue, or 'Try again later' on 5xx.
    """

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


def _safe_oauth_error(resp: httpx.Response) -> str:
    """Extract the structured ``error`` code from an OAuth error response.

    Returns just the short machinery code (e.g. ``invalid_grant``) so logs
    stay useful without dumping the full upstream body, which can contain
    request material we don't want in our log stream.
    """
    try:
        return str(resp.json().get("error", "")) or "unknown"
    except Exception:
        return "unparseable"


def _require_credentials() -> tuple[str, str, str]:
    """Pull OAuth client creds from settings or raise.

    Centralised so every entry point in this module gives the same
    error message when the operator forgot to set env vars.
    """
    client_id = settings.google_health_client_id
    client_secret = settings.google_health_client_secret
    redirect_uri = settings.google_health_redirect_uri
    if not (client_id and client_secret and redirect_uri):
        raise GoogleHealthError(
            "Google Health credentials are not configured "
            "(GOOGLE_HEALTH_CLIENT_ID / _SECRET / _REDIRECT_URI)."
        )
    return client_id, client_secret, redirect_uri


# ─────────────────────────────────────────────────────────────────────
# OAuth flow
# ─────────────────────────────────────────────────────────────────────


def build_oauth_url(state: str, *, scopes: tuple[str, ...] | None = None) -> str:
    """Build the consent-screen URL the user is redirected to.

    `state` is opaque to Google; the caller signs it (HMAC or JWT) and
    validates the round-trip in the callback to defeat CSRF. We never
    persist it — by the time `state` makes it back to us, the only
    interesting bit is the user_id we encoded.

    `access_type=offline` + `prompt=consent` together force Google to
    issue a refresh_token on every grant. Without `prompt=consent` a
    repeat grant by the same user returns only an access_token, which
    leaves the Celery sync task unable to refresh.
    """
    client_id, _, redirect_uri = _require_credentials()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes or _DEFAULT_SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return f"{_OAUTH_AUTH_URL}?{urllib.parse.urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    """Exchange an authorization code for access + refresh tokens.

    Returns the raw token JSON shape Google sends back:
        {
          "access_token": str,
          "expires_in": int,           # seconds
          "refresh_token": str,        # only present with prompt=consent
          "scope": str,                # space-delimited granted scopes
          "token_type": "Bearer",
          "id_token": str (optional),
        }
    """
    client_id, client_secret, redirect_uri = _require_credentials()
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(_OAUTH_TOKEN_URL, data=payload)
    if resp.status_code != 200:
        # Log only the structured OAuth error code, never the raw body —
        # the token endpoint's response can echo back request material.
        logger.warning(
            "Google token exchange failed: status=%s error=%s",
            resp.status_code,
            _safe_oauth_error(resp),
        )
        raise GoogleHealthError(
            "Google rejected the authorization code.",
            status_code=resp.status_code,
        )
    return resp.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    """Trade a refresh token for a new access token.

    Google typically returns a new access_token + expires_in only —
    refresh_token is omitted unless rotation kicks in. Callers must
    preserve the existing refresh_token if the response omits it.
    """
    client_id, client_secret, _ = _require_credentials()
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(_OAUTH_TOKEN_URL, data=payload)
    if resp.status_code != 200:
        # 400 with error=invalid_grant means the refresh token has been
        # revoked (user disconnected from their Google account settings)
        # — caller should mark the connection inactive and prompt
        # re-consent rather than retrying.
        logger.warning(
            "Google token refresh failed: status=%s error=%s",
            resp.status_code,
            _safe_oauth_error(resp),
        )
        raise GoogleHealthError(
            "Failed to refresh Google access token.",
            status_code=resp.status_code,
        )
    return resp.json()


async def revoke_token(token: str) -> None:
    """Revoke an access or refresh token. Idempotent — a 400 from Google
    means the token was already invalid and is treated as success."""
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.post(_OAUTH_REVOKE_URL, params={"token": token})
    if resp.status_code not in (200, 400):
        logger.warning("Google token revoke unexpected status: %s", resp.status_code)
        raise GoogleHealthError(
            "Failed to revoke Google token.",
            status_code=resp.status_code,
        )


# ─────────────────────────────────────────────────────────────────────
# User identity & data fetch
# ─────────────────────────────────────────────────────────────────────


async def fetch_user_profile(access_token: str) -> dict[str, Any]:
    """Return the connected user's Google profile (used for
    ``external_account_id`` on ConnectedDevice).

    Returns the OIDC userinfo shape: {sub, email, name, picture, ...}.
    The 'sub' field is the stable Google user ID.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(_OAUTH_USERINFO_URL, headers=headers)
    if resp.status_code != 200:
        raise GoogleHealthError(
            "Failed to fetch Google user profile.",
            status_code=resp.status_code,
        )
    return resp.json()


async def fetch_data(
    access_token: str,
    data_type: str,
    since: datetime.datetime,
    until: datetime.datetime,
) -> list[dict[str, Any]]:
    """Fetch one data-type's records for a time window.

    `data_type` is the Google Health API type identifier (e.g.
    ``heart_rate``, ``steps``, ``sleep_session``) — the normalizer
    knows the exact set and how each maps to ``MetricTypeEnum``.

    TODO: the v1 REST path is documented at developers.google.com/health
    but Google reserves the right to evolve the shape. If the live API
    differs from the path/body convention assumed here, only this
    function needs updating — callers receive plain dicts that the
    normalizer interprets.
    """
    # Path convention assumed: GET /v1/users/me/dataTypes/{type}/records
    # with ISO-8601 timestamp range as query string. If Google ships a
    # different convention, swap this URL — nothing else changes.
    url = f"{_HEALTH_API_BASE}/users/me/dataTypes/{data_type}/records"
    params = {
        "startTime": since.isoformat(),
        "endTime": until.isoformat(),
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(url, headers=headers, params=params)
    if resp.status_code == 401:
        # Access token expired — caller will refresh and retry.
        raise GoogleHealthError(
            "Google access token expired.",
            status_code=401,
        )
    if resp.status_code != 200:
        logger.warning(
            "Google Health fetch failed for %s: %s %s",
            data_type, resp.status_code, resp.text[:200],
        )
        raise GoogleHealthError(
            f"Failed to fetch {data_type} from Google Health.",
            status_code=resp.status_code,
        )
    body = resp.json()
    # Google list responses are typically wrapped in a "records" or
    # "items" key. Be defensive — return whichever is present, falling
    # back to an empty list so callers can iterate without guarding.
    if isinstance(body, list):
        return body
    return body.get("records") or body.get("items") or []


async def register_webhook(
    access_token: str,
    callback_url: str,
    data_types: list[str],
) -> str | None:
    """Try to register a push-notification subscription. Returns the
    subscription ID on success, or None if Google Health does not yet
    expose webhooks (in which case the Celery Beat poller is the only
    delivery path).

    TODO: webhook subscription is not yet GA per Google's docs — the
    endpoint is left abstract here. The function returning None lets
    the OAuth callback succeed regardless of webhook availability.
    """
    # Intentionally a no-op stub until Google publishes the webhook
    # contract. Returning None signals "no subscription" and callers
    # rely on the beat-schedule poller.
    logger.info(
        "Google Health webhook subscription not yet available; "
        "falling back to Celery Beat polling (data_types=%s)", data_types,
    )
    return None

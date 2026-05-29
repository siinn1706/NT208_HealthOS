"""Google Health API client — pure functions, no DB access.

Wraps the standard Google OAuth 2.0 flow plus the Google Health REST
API. The caller is responsible for persisting tokens (via
``ConnectedDevice`` + ``token_crypto``) and for invoking ``fetch_data``
on the schedule it prefers (Celery Beat at 15-minute intervals, or
on-demand from the OAuth callback).

The 'Google Health API' here is the cloud/server-side API documented at
https://developers.google.com/health — Google's recommended successor for
web/OAuth integrations, replacing the deprecated Google Fit APIs (end of
service late 2026) and absorbing the Fitbit Web API. We do **not** target
the legacy Fit Fitness API or the on-device Health Connect SDK.

Confirmed from the official docs + live v4 discovery doc: base is
``health.googleapis.com/v4``, data lives under
``users/*/dataTypes/*/dataPoints``, scopes are the Restricted
``googlehealth.*`` categories, and webhooks are real (server-managed
``subscribers``/``subscriptions`` resources). Still TODO (need a captured
real payload — see Phase C/D notes on the functions below): the exact
``dataPoints`` request params, the nested per-point JSON shape, and the
data-type identifier vocabulary the normalizer maps. The caller's contract
(``fetch_data`` returns a list of plain dicts the normalizer consumes) is
stable regardless of the concrete field names.
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
# v4 is the current GA major (confirmed against the live discovery doc:
# https://health.googleapis.com/$discovery/rest?version=v4). Pinned so a
# future v5 with different request/response shapes can't break us silently.
_HEALTH_API_BASE: Final[str] = "https://health.googleapis.com/v4"

# ── Scopes requested at consent time.
# Reference: https://developers.google.com/health/scopes
#
# The real Google Health scopes are COARSE category buckets under the
# `googlehealth` prefix (not the per-metric `health.*.read` strings an
# earlier draft of this file guessed). Each is *Restricted*, so the OAuth
# app must pass Google verification + an annual CASA security assessment
# before non-test users can grant them.
#
# We request the read-only categories that cover every metric in
# normalizer._GOOGLE_HEALTH_TYPE_MAP. The exact metric→category membership
# is documented per data-type table on the scopes page; confirm it against
# real `dataPoints` payloads (Phase C) and trim/extend this set so we don't
# over-request at review time. `openid/email/profile` stay for the OIDC
# userinfo call in fetch_user_profile.
_DEFAULT_SCOPES: Final[tuple[str, ...]] = (
    "openid",
    "email",
    "profile",
    # Steps, distance, calories, exercise, floors, active minutes, VO2 max.
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
    # HR (resting/max/HRV), blood pressure, SpO2, respiratory rate, weight,
    # height, body composition, blood glucose, body/skin temperature, stress.
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    # Sleep stages + efficiency.
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    # Hydration / nutrition.
    "https://www.googleapis.com/auth/googlehealth.nutrition.readonly",
    # Profile (used to bind external_account_id).
    "https://www.googleapis.com/auth/googlehealth.profile.readonly",
)

# Network timeout for every upstream call. Google's APIs are usually
# fast, but we wrap an explicit cap so a stuck request can't pin a
# Celery worker. 10 s matches the auth.py httpx pattern.
_HTTP_TIMEOUT: Final[float] = 10.0

# Hard cap on pages followed per data-type in `fetch_data`. Google list
# endpoints paginate via `nextPageToken`; without a ceiling a buggy or
# hostile upstream that always echoes a token would loop forever and pin
# a worker. 50 pages is far beyond any honest 30-day backfill, and keeps
# the worst-case single-type duration (50 × _HTTP_TIMEOUT = 500 s) below
# the per-device sync lock TTL so the lock can't silently lapse mid-sweep.
_MAX_PAGES_PER_FETCH: Final[int] = 50


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
    """Fetch one data-type's data points for a time window.

    `data_type` is the Google Health API data-type identifier (kebab-case,
    e.g. ``steps``, ``heart-rate``, ``sleep``) — the normalizer knows the
    set and how each maps to ``MetricTypeEnum``.

    Confirmed against the live v4 contract:
        GET /v4/users/{user}/dataTypes/{dataType}/dataPoints
    (resource is ``dataPoints``, not ``records``; reference:
    developers.google.com/health/reference/rest).

    TODO(Phase C/D): the exact request param names for the time window and
    page size, plus the response array/field names, still need pinning from
    a captured real payload + the v4 discovery doc. The query keys below are
    the AIP-standard guesses; only this function changes when confirmed —
    callers receive plain dicts the normalizer interprets.
    """
    # `users/me` is the caller-identity alias; confirm in Phase C whether v4
    # accepts it or requires the id from the getIdentity endpoint.
    url = f"{_HEALTH_API_BASE}/users/me/dataTypes/{data_type}/dataPoints"
    base_params = {
        "startTime": since.isoformat(),
        "endTime": until.isoformat(),
    }
    headers = {"Authorization": f"Bearer {access_token}"}

    # Follow `nextPageToken` across pages so a multi-page window (a 30-day
    # backfill almost always is) isn't silently truncated to the first
    # page. One client for the whole walk reuses the connection. The page
    # cap bounds the loop against an upstream that never stops handing out
    # tokens.
    records: list[dict[str, Any]] = []
    page_token: str | None = None
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        for _ in range(_MAX_PAGES_PER_FETCH):
            params = dict(base_params)
            if page_token:
                params["pageToken"] = page_token
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
            # The v4 list response wraps the page in a "dataPoints" array.
            # Keep "records"/"items" as defensive fallbacks until the exact
            # field is pinned from a captured payload (Phase C). A bare list
            # carries no pagination envelope, so it's always a single page.
            if isinstance(body, list):
                records.extend(body)
                break
            records.extend(
                body.get("dataPoints")
                or body.get("records")
                or body.get("items")
                or []
            )
            page_token = body.get("nextPageToken") or body.get("next_page_token")
            if not page_token:
                break
        else:
            # Loop exhausted the cap without a terminating page — the window
            # may be truncated. Log loudly; callers treat what we return as
            # complete, so this is the only signal that it might not be.
            logger.warning(
                "Google Health fetch for %s hit the %d-page cap — "
                "results may be truncated.",
                data_type, _MAX_PAGES_PER_FETCH,
            )
    return records


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

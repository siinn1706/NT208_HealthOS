"""Open Wearables client — unified wearable aggregator (self-hosted).

One integration that fans out to Garmin / Oura / Whoop / Fitbit / Apple /
Google / Samsung / Polar / Suunto / Ultrahuman / Strava via a self-hosted
`Open Wearables <https://github.com/the-momentum/open-wearables>`_ instance.
We talk to it server-to-server with a developer **API key**; it owns the
per-provider OAuth, token refresh, polling, and normalization.

Confirmed from the Open Wearables source (backend/app/api/routes/v1):
  * Connect:  GET /api/v1/oauth/{provider}/authorize?user_id=&redirect_uri=
              → {"authorization_url", "state"}.  Open Wearables handles the
              provider callback itself and auto-backfills on connect.
  * Connections: GET/DELETE /api/v1/users/{user_id}/connections[/{provider}].
  * Pull:     GET /api/v1/users/{user_id}/timeseries?types=&start_time=
              &end_time=&resolution=raw&cursor= → PaginatedResponse[TimeSeriesSample].
  * Push:     Svix outgoing webhooks (register an endpoint, fetch its secret,
              verify the Svix signature on inbound) — handled in the webhook
              endpoint, not here.
  * Vocab:    SeriesType enum (heart_rate, oxygen_saturation, steps, ...).

CONFIRM against the live instance's OpenAPI (http://<host>:8000/docs) before
production — see the ``# CONFIRM`` markers:
  1. the API-key header name (ApiKeyDep),
  2. the **unit** Open Wearables emits per SeriesType (series_types.py has a
     UNITS table) so the scale factors below are right,
  3. the ``TimeSeriesSample`` field names (value / timestamp / id) and the
     ``PaginatedResponse`` cursor field.
"""
from __future__ import annotations

import datetime
import logging
import urllib.parse
from typing import Any, Final

import httpx

from app.core.config import settings
from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.sync import HealthRecordIn

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT: Final[float] = 10.0
_MAX_PAGES: Final[int] = 50
# CONFIRM: ApiKeyDep header name in Open Wearables (app/services). Common is
# "X-API-Key"; some builds accept "Authorization: Bearer". Verify at /docs.
_API_KEY_HEADER: Final[str] = "X-API-Key"


class OpenWearablesError(RuntimeError):
    """Any non-recoverable failure talking to the Open Wearables instance."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


# ── SeriesType slug → (our MetricTypeEnum, canonical unit, scale) ────────
# `scale` multiplies Open Wearables' value to reach our canonical unit.
# CONFIRM every `scale` against series_types.py's UNITS table — left at 1.0
# where OW's unit is assumed to already match ours.
_SERIES_TYPE_TO_METRIC: dict[str, tuple[MetricTypeEnum, str, float]] = {
    "heart_rate": (MetricTypeEnum.HEART_RATE, "bpm", 1.0),
    "resting_heart_rate": (MetricTypeEnum.HEART_RATE_RESTING, "bpm", 1.0),
    "heart_rate_variability_rmssd": (MetricTypeEnum.HRV_RMSSD, "ms", 1.0),
    "oxygen_saturation": (MetricTypeEnum.SPO2, "%", 1.0),
    "respiratory_rate": (MetricTypeEnum.RESPIRATORY_RATE, "rpm", 1.0),
    "blood_glucose": (MetricTypeEnum.BLOOD_GLUCOSE, "mg/dL", 1.0),  # CONFIRM unit (mg/dL vs mmol/L)
    "blood_pressure_systolic": (MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC, "mmHg", 1.0),
    "blood_pressure_diastolic": (MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC, "mmHg", 1.0),
    "vo2_max": (MetricTypeEnum.VO2_MAX, "ml/kg/min", 1.0),
    "steps": (MetricTypeEnum.STEPS, "count", 1.0),
    "energy": (MetricTypeEnum.CALORIES_ACTIVE, "kcal", 1.0),  # CONFIRM kcal vs kJ
    "weight": (MetricTypeEnum.WEIGHT_KG, "kg", 1.0),  # CONFIRM kg vs g
    "height": (MetricTypeEnum.HEIGHT_CM, "cm", 1.0),  # CONFIRM cm vs m
    "body_fat_percentage": (MetricTypeEnum.BODY_FAT_PERCENTAGE, "%", 1.0),
    "body_mass_index": (MetricTypeEnum.BMI, "kg/m2", 1.0),
    "lean_body_mass": (MetricTypeEnum.LEAN_BODY_MASS, "kg", 1.0),
    "body_temperature": (MetricTypeEnum.BODY_TEMPERATURE, "C", 1.0),
    "skin_temperature_deviation": (MetricTypeEnum.SKIN_TEMPERATURE_DELTA, "C", 1.0),
    # CONFIRM remaining SeriesType slugs (distance, sleep stages, stress,
    # hydration, mindfulness, menstrual flow) from series_types.py and extend.
}

# The set of SeriesType slugs we pull (the `types=` query repeats per value).
SUPPORTED_SERIES_TYPES: Final[tuple[str, ...]] = tuple(_SERIES_TYPE_TO_METRIC)


def _require_config() -> tuple[str, str]:
    base_url = settings.open_wearables_base_url
    api_key = settings.open_wearables_api_key
    if not (base_url and api_key):
        raise OpenWearablesError(
            "Open Wearables is not configured "
            "(OPEN_WEARABLES_BASE_URL / OPEN_WEARABLES_API_KEY)."
        )
    return base_url.rstrip("/"), api_key


def _headers(api_key: str) -> dict[str, str]:
    return {_API_KEY_HEADER: api_key}


# ─────────────────────────────────────────────────────────────────────
# Connect flow
# ─────────────────────────────────────────────────────────────────────


async def get_authorization_url(
    provider: str,
    ow_user_id: str,
    redirect_uri: str,
) -> str:
    """Ask Open Wearables for a provider consent URL for ``ow_user_id``.

    Open Wearables runs the provider OAuth and handles the callback itself;
    we just send the user to ``authorization_url`` and later learn the
    connection succeeded via the ``connection.created`` webhook.
    """
    base_url, api_key = _require_config()
    qs = urllib.parse.urlencode({"user_id": ow_user_id, "redirect_uri": redirect_uri})
    url = f"{base_url}/api/v1/oauth/{provider}/authorize?{qs}"
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(url, headers=_headers(api_key))
    if resp.status_code != 200:
        logger.warning(
            "Open Wearables authorize failed: provider=%s status=%s",
            provider, resp.status_code,
        )
        raise OpenWearablesError(
            f"Failed to start OAuth for provider {provider}.",
            status_code=resp.status_code,
        )
    body = resp.json()
    auth_url = body.get("authorization_url")
    if not auth_url:
        raise OpenWearablesError("Open Wearables returned no authorization_url.")
    return str(auth_url)


async def list_connections(ow_user_id: str) -> list[dict[str, Any]]:
    """Return the user's connected providers (with capability metadata)."""
    base_url, api_key = _require_config()
    url = f"{base_url}/api/v1/users/{ow_user_id}/connections"
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(url, headers=_headers(api_key))
    if resp.status_code != 200:
        raise OpenWearablesError(
            "Failed to list Open Wearables connections.",
            status_code=resp.status_code,
        )
    body = resp.json()
    return body if isinstance(body, list) else body.get("data") or []


async def disconnect(ow_user_id: str, provider: str) -> None:
    """Revoke a provider connection for the user (idempotent-ish)."""
    base_url, api_key = _require_config()
    url = f"{base_url}/api/v1/users/{ow_user_id}/connections/{provider}"
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.delete(url, headers=_headers(api_key))
    if resp.status_code not in (200, 204, 404):
        raise OpenWearablesError(
            "Failed to disconnect Open Wearables provider.",
            status_code=resp.status_code,
        )


# ─────────────────────────────────────────────────────────────────────
# Data pull (timeseries) + normalization
# ─────────────────────────────────────────────────────────────────────


async def fetch_timeseries(
    ow_user_id: str,
    series_types: list[str],
    since: datetime.datetime,
    until: datetime.datetime,
    *,
    resolution: str = "raw",
) -> list[dict[str, Any]]:
    """Pull granular timeseries samples for a window, following the cursor.

    Returns the raw ``TimeSeriesSample`` dicts; ``timeseries_sample_to_record``
    maps each to a ``HealthRecordIn``.
    """
    base_url, api_key = _require_config()
    url = f"{base_url}/api/v1/users/{ow_user_id}/timeseries"
    base_params: list[tuple[str, str]] = [
        ("start_time", since.isoformat()),
        ("end_time", until.isoformat()),
        ("resolution", resolution),
        *[("types", t) for t in series_types],
    ]
    samples: list[dict[str, Any]] = []
    cursor: str | None = None
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        for _ in range(_MAX_PAGES):
            params = list(base_params)
            if cursor:
                params.append(("cursor", cursor))
            resp = await client.get(url, headers=_headers(api_key), params=params)
            if resp.status_code != 200:
                raise OpenWearablesError(
                    "Failed to fetch Open Wearables timeseries.",
                    status_code=resp.status_code,
                )
            body = resp.json()
            page = body.get("data") if isinstance(body, dict) else body
            samples.extend(page or [])
            # CONFIRM cursor field name (PaginatedResponse: cursor / next_cursor / iterator).
            cursor = body.get("cursor") or body.get("next_cursor") if isinstance(body, dict) else None
            if not cursor:
                break
        else:
            logger.warning("Open Wearables timeseries hit the %d-page cap.", _MAX_PAGES)
    return samples


def timeseries_sample_to_record(
    sample: dict[str, Any],
    *,
    source_app: str | None = None,
) -> HealthRecordIn | None:
    """Map one Open Wearables TimeSeriesSample → HealthRecordIn (None = skip).

    CONFIRM the TimeSeriesSample field names against the live schema
    (schemas/responses/activity, TimeSeriesSample): the ``series_type`` slug,
    the numeric ``value``, the ``timestamp``, and a stable per-sample id.
    """
    series = sample.get("series_type") or sample.get("type")  # CONFIRM
    mapping = _SERIES_TYPE_TO_METRIC.get(str(series))
    if mapping is None:
        return None  # unmapped series — skip
    metric, unit, scale = mapping

    raw_value = sample.get("value")  # CONFIRM field
    if not isinstance(raw_value, (int, float)):
        return None
    value = float(raw_value) * scale

    ts_raw = sample.get("timestamp") or sample.get("start_time") or sample.get("time")  # CONFIRM
    recorded_at = _parse_ts(ts_raw)
    if recorded_at is None:
        return None

    # Stable external id so re-pulls dedupe. Prefer an OW-provided id; fall
    # back to (series, timestamp) which is unique per metric per instant.
    external_id = sample.get("id") or f"{series}:{recorded_at.isoformat()}"

    try:
        return HealthRecordIn(
            external_id=str(external_id)[:128],
            external_version=None,
            metric_type=metric,
            value=value,
            unit=unit,
            recorded_at=recorded_at,
            source=WearableSourceEnum.GOOGLE_HEALTH,  # CONFIRM: add an OPEN_WEARABLES source enum value
            source_app=source_app,
            recording_method=None,
            is_deleted=False,
        )
    except Exception:
        return None


def _parse_ts(value: Any) -> datetime.datetime | None:
    if isinstance(value, (int, float)):
        ts = float(value) / 1000.0 if value > 10**11 else float(value)
        return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    if isinstance(value, str):
        try:
            dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
    return None

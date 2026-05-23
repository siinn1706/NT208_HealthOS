"""Normalize external wearable payloads to ``HealthRecordIn`` instances.

Both Google Health (Luồng B) and — when needed — Health Connect (Luồng A)
funnel through here so the downstream ``health_sync.upsert_batch`` only
ever sees one canonical row shape. Per-metric medical-range guards drop
implausible values (HR > 220, SpO2 < 70, etc.) instead of poisoning the
DB; the dropped rows are returned alongside the accepted ones so the
caller can log them without hand-rolling its own filter.

The ``HealthRecordIn`` schema's own ``validate_medical_range`` only
covers the 6 legacy MetricTypeEnum values; the new wearable-expansion
metrics rely entirely on the bounds enforced here. If the wider schema
later grows medical-range support for those values, this module can
shed the duplicated bounds.
"""
from __future__ import annotations

import datetime
import logging
import uuid
from dataclasses import dataclass
from typing import Any, Iterable

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.sync import HealthRecordIn

logger = logging.getLogger(__name__)


# ── Per-metric medical bounds. Keys cover the wearable-expansion enum
# values (the 6 legacy values are validated by HealthRecordIn itself).
# Bounds are deliberately wide — the goal is "reject obvious garbage"
# (sensor glitches, unit-mismatch bugs upstream) rather than enforce
# clinical normal ranges. ──
_RANGES: dict[MetricTypeEnum, tuple[float, float]] = {
    # Cardiovascular
    MetricTypeEnum.HEART_RATE_RESTING: (20, 200),
    MetricTypeEnum.HEART_RATE_MAX: (60, 250),
    MetricTypeEnum.HRV_RMSSD: (1, 500),  # ms
    # Respiratory
    MetricTypeEnum.SPO2: (50, 100),  # %
    MetricTypeEnum.RESPIRATORY_RATE: (4, 60),  # breaths/min
    MetricTypeEnum.VO2_MAX: (5, 90),  # ml/kg/min
    # Activity
    MetricTypeEnum.DISTANCE_M: (0, 500000),  # 500 km / day cap
    MetricTypeEnum.CALORIES_ACTIVE: (0, 20000),
    MetricTypeEnum.CALORIES_TOTAL: (0, 20000),
    MetricTypeEnum.FLOORS_CLIMBED: (0, 1000),
    MetricTypeEnum.ACTIVE_MINUTES: (0, 1440),
    MetricTypeEnum.EXERCISE_SESSION_MINUTES: (0, 1440),
    # Sleep (minutes)
    MetricTypeEnum.SLEEP_LIGHT: (0, 1440),
    MetricTypeEnum.SLEEP_DEEP: (0, 1440),
    MetricTypeEnum.SLEEP_REM: (0, 1440),
    MetricTypeEnum.SLEEP_AWAKE: (0, 1440),
    MetricTypeEnum.SLEEP_EFFICIENCY: (0, 100),  # %
    # Body composition
    MetricTypeEnum.BODY_FAT_PERCENTAGE: (3, 70),
    MetricTypeEnum.LEAN_BODY_MASS: (10, 200),  # kg
    MetricTypeEnum.BONE_MASS: (0.5, 10),  # kg
    MetricTypeEnum.BODY_WATER: (20, 80),  # %
    MetricTypeEnum.BMI: (8, 80),
    MetricTypeEnum.HEIGHT_CM: (40, 260),
    # Temperature
    MetricTypeEnum.BODY_TEMPERATURE: (30, 45),  # °C
    MetricTypeEnum.SKIN_TEMPERATURE_DELTA: (-10, 10),  # °C delta
    # Misc
    MetricTypeEnum.BLOOD_GLUCOSE: (20, 600),  # mg/dL
    MetricTypeEnum.HYDRATION_ML: (0, 20000),
    MetricTypeEnum.STRESS_SCORE: (0, 100),
    MetricTypeEnum.MENSTRUAL_FLOW: (0, 5),  # 0=none .. 5=heavy (numeric encoding)
    MetricTypeEnum.MINDFULNESS_MINUTES: (0, 1440),
}


# ── Google Health "data type" identifier → (MetricTypeEnum, canonical unit) ──
# Identifiers loosely follow the documented Google Health vocabulary; if
# the live API uses different identifiers, change this map and the rest
# of the pipeline keeps working. ──
_GOOGLE_HEALTH_TYPE_MAP: dict[str, tuple[MetricTypeEnum, str]] = {
    "heart_rate": (MetricTypeEnum.HEART_RATE, "bpm"),
    "heart_rate_resting": (MetricTypeEnum.HEART_RATE_RESTING, "bpm"),
    "heart_rate_max": (MetricTypeEnum.HEART_RATE_MAX, "bpm"),
    "heart_rate_variability": (MetricTypeEnum.HRV_RMSSD, "ms"),
    "blood_pressure_systolic": (MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC, "mmHg"),
    "blood_pressure_diastolic": (MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC, "mmHg"),
    "oxygen_saturation": (MetricTypeEnum.SPO2, "%"),
    "respiratory_rate": (MetricTypeEnum.RESPIRATORY_RATE, "rpm"),
    "vo2_max": (MetricTypeEnum.VO2_MAX, "ml/kg/min"),
    "steps": (MetricTypeEnum.STEPS, "count"),
    "distance": (MetricTypeEnum.DISTANCE_M, "m"),
    "active_calories": (MetricTypeEnum.CALORIES_ACTIVE, "kcal"),
    "total_calories": (MetricTypeEnum.CALORIES_TOTAL, "kcal"),
    "floors_climbed": (MetricTypeEnum.FLOORS_CLIMBED, "count"),
    "active_minutes": (MetricTypeEnum.ACTIVE_MINUTES, "min"),
    "exercise_session": (MetricTypeEnum.EXERCISE_SESSION_MINUTES, "min"),
    "sleep_light": (MetricTypeEnum.SLEEP_LIGHT, "min"),
    "sleep_deep": (MetricTypeEnum.SLEEP_DEEP, "min"),
    "sleep_rem": (MetricTypeEnum.SLEEP_REM, "min"),
    "sleep_awake": (MetricTypeEnum.SLEEP_AWAKE, "min"),
    "sleep_total": (MetricTypeEnum.SLEEP_MINUTES, "min"),
    "sleep_efficiency": (MetricTypeEnum.SLEEP_EFFICIENCY, "%"),
    "weight": (MetricTypeEnum.WEIGHT_KG, "kg"),
    "height": (MetricTypeEnum.HEIGHT_CM, "cm"),
    "body_fat": (MetricTypeEnum.BODY_FAT_PERCENTAGE, "%"),
    "lean_body_mass": (MetricTypeEnum.LEAN_BODY_MASS, "kg"),
    "bone_mass": (MetricTypeEnum.BONE_MASS, "kg"),
    "body_water": (MetricTypeEnum.BODY_WATER, "%"),
    "bmi": (MetricTypeEnum.BMI, "kg/m2"),
    "body_temperature": (MetricTypeEnum.BODY_TEMPERATURE, "C"),
    "skin_temperature_delta": (MetricTypeEnum.SKIN_TEMPERATURE_DELTA, "C"),
    "blood_glucose": (MetricTypeEnum.BLOOD_GLUCOSE, "mg/dL"),
    "hydration": (MetricTypeEnum.HYDRATION_ML, "mL"),
    "stress_score": (MetricTypeEnum.STRESS_SCORE, "score"),
    "menstrual_flow": (MetricTypeEnum.MENSTRUAL_FLOW, "level"),
    "mindfulness_minutes": (MetricTypeEnum.MINDFULNESS_MINUTES, "min"),
}


@dataclass(frozen=True)
class NormalizeReport:
    """Outcome of one normalize() run.

    `accepted` is the list ready to hand to ``upsert_batch``; `dropped`
    is a parallel list of (raw record, reason) tuples so the caller
    can audit-log them without re-implementing the rules.
    """

    accepted: list[HealthRecordIn]
    dropped: list[tuple[dict[str, Any], str]]


# ─────────────────────────────────────────────────────────────────────
# Public entrypoints
# ─────────────────────────────────────────────────────────────────────


def normalize_google_health(
    payload: Iterable[dict[str, Any]],
    *,
    data_type: str,
    source_app: str | None = None,
) -> NormalizeReport:
    """Normalize a Google Health REST response into ``HealthRecordIn``.

    `payload` is the list of raw record dicts returned by
    ``google_health.fetch_data``. `data_type` is the same string passed
    into ``fetch_data`` — used to pick the metric mapping (we don't
    re-derive it from per-record fields because Google's records often
    omit the type when it's clear from the request URL).

    Out-of-range values are returned in `dropped`, not silently
    discarded, so callers can decide whether to alert (e.g., 100 %
    drop-rate on a record type is suspicious and probably a unit bug
    on Google's side).
    """
    mapping = _GOOGLE_HEALTH_TYPE_MAP.get(data_type)
    if mapping is None:
        # Unknown data_type — every record gets dropped with a clear
        # reason rather than throwing, so a single unexpected type
        # doesn't kill the rest of the sync.
        records_list = list(payload)
        logger.warning(
            "normalize_google_health: unknown data_type %r (%d records dropped)",
            data_type, len(records_list),
        )
        return NormalizeReport(
            accepted=[],
            dropped=[(r, f"UNKNOWN_DATA_TYPE:{data_type}") for r in records_list],
        )

    metric_type, canonical_unit = mapping
    accepted: list[HealthRecordIn] = []
    dropped: list[tuple[dict[str, Any], str]] = []

    for raw in payload:
        try:
            row = _build_record_from_google(raw, metric_type, canonical_unit, source_app)
        except _DropRow as drop:
            dropped.append((raw, drop.reason))
            continue
        # Range gate — only for new wearable-expansion metrics; legacy
        # values are already bounded by HealthRecordIn's own validator.
        bounds = _RANGES.get(metric_type)
        if bounds is not None:
            lo, hi = bounds
            if not (lo <= row.value <= hi):
                dropped.append((raw, f"OUT_OF_RANGE:{row.value} not in [{lo},{hi}]"))
                continue
        accepted.append(row)

    return NormalizeReport(accepted=accepted, dropped=dropped)


def normalize_health_connect(
    payload: Iterable[dict[str, Any]],
    *,
    record_type: str,
    source_app: str | None = None,
) -> NormalizeReport:
    """Reserved for future use.

    As of this commit the mobile app already POSTs HC data in
    ``HealthIngestBatch`` shape directly to ``/v1/devices/{id}/ingest``,
    so the inbound payload is already a ``HealthRecordIn``. This
    function is left as a placeholder so the Celery task and any
    future server-side HC ingestion (e.g., re-import of an archived
    HC export) share a single normalize entry point.
    """
    raise NotImplementedError(
        "normalize_health_connect: mobile clients should post directly "
        "to /v1/devices/{id}/ingest with HealthIngestBatch shape. "
        "Server-side HC normalization is not yet needed."
    )


# ─────────────────────────────────────────────────────────────────────
# Internals
# ─────────────────────────────────────────────────────────────────────


class _DropRow(Exception):
    """Lightweight signal — caller turns it into a (raw, reason) tuple
    on the dropped list. Not exported."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _build_record_from_google(
    raw: dict[str, Any],
    metric_type: MetricTypeEnum,
    canonical_unit: str,
    source_app: str | None,
) -> HealthRecordIn:
    """Turn one Google Health record dict into a ``HealthRecordIn``.

    Required-but-missing fields raise ``_DropRow`` so the caller can
    pick them up without each branch needing its own try/except.
    """
    external_id = (
        raw.get("id")
        or raw.get("recordId")
        or raw.get("metadata", {}).get("id")
    )
    if not external_id:
        # Without an external_id we can't dedupe — the partial unique
        # index would reject every row anyway. Drop early with a clear
        # reason.
        raise _DropRow("MISSING_EXTERNAL_ID")

    # Google records carry the value under different keys depending on
    # the data type. We probe a small set rather than wiring per-type
    # extractors; if Google ships a new shape, extend this list.
    value = (
        raw.get("value")
        if isinstance(raw.get("value"), (int, float))
        else raw.get("count")
        if isinstance(raw.get("count"), (int, float))
        else raw.get("minutes")
        if isinstance(raw.get("minutes"), (int, float))
        else raw.get("kilocalories")
        if isinstance(raw.get("kilocalories"), (int, float))
        else None
    )
    if value is None:
        raise _DropRow("MISSING_VALUE")

    recorded_at = _parse_timestamp(
        raw.get("recordedAt")
        or raw.get("time")
        or raw.get("startTime")
        or raw.get("endTime")
    )
    if recorded_at is None:
        raise _DropRow("MISSING_TIMESTAMP")

    # Google often returns 0-based epoch ms in metadata.lastModifiedTime;
    # promote that to external_version when present so the version-wins
    # upsert can tell newer from older.
    last_modified = raw.get("metadata", {}).get("lastModifiedTime")
    external_version = _coerce_version(last_modified or raw.get("version"))

    try:
        return HealthRecordIn(
            external_id=str(external_id)[:128],
            external_version=external_version,
            metric_type=metric_type,
            value=float(value),
            unit=canonical_unit,
            recorded_at=recorded_at,
            source=WearableSourceEnum.GOOGLE_HEALTH,
            source_app=source_app,
            recording_method=raw.get("metadata", {}).get("recordingMethod"),
            is_deleted=False,
        )
    except Exception as exc:
        # Pydantic validation failure (medical range for legacy types,
        # negative value, etc.) — surface as a drop rather than letting
        # the whole batch fail.
        raise _DropRow(f"VALIDATION:{exc.__class__.__name__}") from exc


def _parse_timestamp(value: Any) -> datetime.datetime | None:
    """Accept ISO-8601 string or epoch seconds/ms; return tz-aware UTC."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # Heuristic: > 10^11 means epoch ms; below, treat as seconds.
        ts = float(value) / 1000.0 if value > 10**11 else float(value)
        return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
    if isinstance(value, str):
        # fromisoformat handles offset suffix (e.g. "2026-05-22T10:00:00+00:00")
        # and bare "Z" (Python 3.11+).
        try:
            dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt
    return None


def _coerce_version(value: Any) -> int | None:
    """Promote various 'version' shapes (epoch ms string, int, etc.) to int."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None

"""DRAFT scaffold — Google Health **v4** dataPoint → HealthRecordIn mapping.

⚠️  NOT wired into anything. This is the Phase D skeleton to reconcile the
normalizer against the real v4 contract. Nothing imports it; the live path
still runs ``normalizer._build_record_from_google`` with the old flat shape.

Why a separate file: the leaf field names below are confirmed from the live
v4 discovery doc, but the *container keys*, the *dataType id strings*, and
the *time-interval field name* are still best-guesses (marked ``# CONFIRM``).
Swapping unverified shapes straight into the live normalizer would turn a
green suite red on a guess. Confirm each ``# CONFIRM`` against
``gh-v4-discovery.json`` (Phase A) + a captured real payload (Phase C), then
lift ``_GOOGLE_HEALTH_V4_TYPE_MAP`` and ``build_record_from_v4`` into
``normalizer.py`` replacing ``_GOOGLE_HEALTH_TYPE_MAP`` /
``_build_record_from_google``.

────────────────────────────────────────────────────────────────────────
RECONCILIATION CHECKLIST (do before integrating)
────────────────────────────────────────────────────────────────────────
1. dataType id strings (dict keys): the URL path is
   ``/v4/users/me/dataTypes/{id}/dataPoints``. Confirm each ``id`` (kebab)
   against the discovery doc's enumerated data types.
2. Container key (``value_key``): the field on a DataPoint that holds the
   typed value object (e.g. DataPoint.steps, DataPoint.heartRate). I assume
   lowerCamel of the schema name — confirm from a real dataPoints payload.
3. Leaf numeric field (``value_leaf``): CONFIRMED from discovery for the
   rows below; double-check the few marked otherwise.
4. Unit scale: distance is **millimeters**, weight **grams**, height
   **millimeters** in v4 → convert to the app's canonical m / kg / cm.
5. Timestamp: events carry ``ObservationTimeInterval``, sessions
   ``SessionTimeInterval`` — confirm the FIELD name on DataPoint that holds
   it (``_TIME_INTERVAL_KEYS`` below) and that ``.startTime`` exists.
6. Version: ``updateTime`` (RFC3339) exists on Sleep/Exercise only. For the
   simple metrics there may be no per-point version — decide whether to fall
   back to startTime-as-version or leave external_version None.
7. DEFERRED metrics (see ``_DEFERRED``): blood pressure, BMI, and several
   others are NOT in the v4 schema surface we inspected. Decide drop vs derive.
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass
from typing import Any

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.sync import HealthRecordIn


@dataclass(frozen=True)
class V4FieldSpec:
    """How to pull one metric out of a v4 DataPoint.

    ``value_key.value_leaf`` is the dotted path into the DataPoint dict
    (``_dig`` walks arbitrary depth). ``scale`` multiplies the raw number to
    reach the app's canonical unit (e.g. 0.001 for millimeters→meters).
    """

    metric: MetricTypeEnum
    unit: str
    value_key: str          # container field on DataPoint (lowerCamel schema)
    value_leaf: str         # numeric leaf inside the container (CONFIRMED)
    scale: float = 1.0

    @property
    def value_path(self) -> str:
        return f"{self.value_key}.{self.value_leaf}"


# ── Confirmed-leaf rows. Keys are the v4 dataType id (URL path segment). ──
# leaf names are CONFIRMED from the discovery doc; value_key + id strings
# are CONFIRM-marked where I inferred them.
_GOOGLE_HEALTH_V4_TYPE_MAP: dict[str, V4FieldSpec] = {
    # ── Activity ──
    "steps": V4FieldSpec(MetricTypeEnum.STEPS, "count", "steps", "count"),
    # v4 Distance is in MILLIMETERS → meters.
    "distance": V4FieldSpec(
        MetricTypeEnum.DISTANCE_M, "m", "distance", "millimeters", scale=0.001
    ),
    "active-energy-burned": V4FieldSpec(  # CONFIRM id
        MetricTypeEnum.CALORIES_ACTIVE, "kcal", "activeEnergyBurned", "kcal"
    ),
    "floors": V4FieldSpec(  # CONFIRM id (maybe "floors-climbed")
        MetricTypeEnum.FLOORS_CLIMBED, "count", "floors", "count"
    ),
    "vo2-max": V4FieldSpec(  # CONFIRM id
        MetricTypeEnum.VO2_MAX, "ml/kg/min", "vo2Max", "vo2Max"
    ),
    # ── Cardiovascular ──
    "heart-rate": V4FieldSpec(
        MetricTypeEnum.HEART_RATE, "bpm", "heartRate", "beatsPerMinute"
    ),
    "daily-resting-heart-rate": V4FieldSpec(  # CONFIRM id — schema DailyRestingHeartRate
        MetricTypeEnum.HEART_RATE_RESTING, "bpm", "dailyRestingHeartRate", "beatsPerMinute"
    ),
    "heart-rate-variability": V4FieldSpec(  # CONFIRM id
        MetricTypeEnum.HRV_RMSSD, "ms", "heartRateVariability",
        "rootMeanSquareOfSuccessiveDifferencesMilliseconds",
    ),
    # ── Respiratory & oximetry ──
    "oxygen-saturation": V4FieldSpec(
        MetricTypeEnum.SPO2, "%", "oxygenSaturation", "percentage"
    ),
    "daily-respiratory-rate": V4FieldSpec(  # CONFIRM id — schema DailyRespiratoryRate
        MetricTypeEnum.RESPIRATORY_RATE, "rpm", "dailyRespiratoryRate", "breathsPerMinute"
    ),
    # ── Body composition / measurement ──
    # v4 Weight is in GRAMS → kg.
    "weight": V4FieldSpec(
        MetricTypeEnum.WEIGHT_KG, "kg", "weight", "weightGrams", scale=0.001
    ),
    # v4 Height is in MILLIMETERS → cm (cm = mm / 10).
    "height": V4FieldSpec(
        MetricTypeEnum.HEIGHT_CM, "cm", "height", "heightMillimeters", scale=0.1
    ),
    "body-fat": V4FieldSpec(  # CONFIRM id
        MetricTypeEnum.BODY_FAT_PERCENTAGE, "%", "bodyFat", "percentage"
    ),
    # ── Temperature ──
    "core-body-temperature": V4FieldSpec(  # CONFIRM id — schema CoreBodyTemperature
        MetricTypeEnum.BODY_TEMPERATURE, "C", "coreBodyTemperature", "temperatureCelsius"
    ),
    # ── Misc ──
    "blood-glucose": V4FieldSpec(
        MetricTypeEnum.BLOOD_GLUCOSE, "mg/dL", "bloodGlucose",
        "bloodGlucoseMilligramsPerDeciliter",
    ),
    # Hydration leaf is itself nested (amountConsumed.milliliters) — _dig walks it.
    "hydration": V4FieldSpec(  # CONFIRM id + container key (schema HydrationLog)
        MetricTypeEnum.HYDRATION_ML, "mL", "hydration", "amountConsumed.milliliters"
    ),
}


# ── Metrics the app maps today but that DON'T cleanly fit the simple
# value_path model in v4 (need a custom handler or are absent). Resolve each
# before declaring v4 parity. ──
_DEFERRED: dict[str, str] = {
    "sleep": (
        "Sleep is a SESSION (SessionTimeInterval) carrying a SleepStage array "
        "(stage type is categorical). SLEEP_LIGHT/DEEP/REM/AWAKE minutes + "
        "SLEEP_EFFICIENCY must be AGGREGATED from the stages — not a value_path. "
        "Write a dedicated sleep handler."
    ),
    "blood_pressure": (
        "No BloodPressure schema surfaced in the inspected v4 discovery. Two "
        "values per reading (systolic/diastolic). Confirm the real data type "
        "before mapping BLOOD_PRESSURE_SYSTOLIC/DIASTOLIC."
    ),
    "bmi": "No BMI schema in v4 — derive from weight+height, or drop.",
    "exercise_session": (
        "Exercise is a session with updateTime; EXERCISE_SESSION_MINUTES needs "
        "duration from its interval, not a scalar leaf."
    ),
    "unresolved_metrics": (
        "Not seen in the inspected schema — confirm existence/field names: "
        "HEART_RATE_MAX, ACTIVE_MINUTES, CALORIES_TOTAL, LEAN_BODY_MASS, "
        "BONE_MASS, BODY_WATER, SKIN_TEMPERATURE_DELTA, STRESS_SCORE, "
        "MENSTRUAL_FLOW, MINDFULNESS_MINUTES."
    ),
}


# DataPoint fields that may hold the time interval object. Confirm which one
# v4 actually uses (events vs sessions) from a real payload.
_TIME_INTERVAL_KEYS: tuple[str, ...] = (
    "observationTimeInterval",  # CONFIRM — events
    "sessionTimeInterval",      # CONFIRM — sessions
    "interval",                 # CONFIRM — fallback seen in summary
)


def _dig(obj: Any, dotted: str) -> Any:
    """Walk a dotted path through nested dicts; return None if any hop misses."""
    cur = obj
    for part in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _parse_rfc3339(value: Any) -> datetime.datetime | None:
    """Parse an RFC3339 / ISO-8601 timestamp to tz-aware UTC, else None."""
    if not isinstance(value, str):
        return None
    try:
        dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt


def build_record_from_v4(
    data_point: dict[str, Any],
    spec: V4FieldSpec,
    *,
    source_app: str | None = None,
) -> HealthRecordIn | None:
    """DRAFT: turn one v4 DataPoint into a HealthRecordIn (None = drop).

    Mirrors normalizer._build_record_from_google so it can be lifted in once
    confirmed. Returns None instead of raising so the integration step can
    decide its own drop-reason bookkeeping.
    """
    # Identifier — v4 uses the full resource `name`.
    external_id = data_point.get("name")
    if not external_id:
        return None  # MISSING_EXTERNAL_ID

    raw_value = _dig(data_point, spec.value_path)
    if not isinstance(raw_value, (int, float)):
        return None  # MISSING_VALUE — confirm value_key/value_leaf if this fires

    value = float(raw_value) * spec.scale

    # Timestamp — try each candidate interval container, then .startTime.
    recorded_at: datetime.datetime | None = None
    for key in _TIME_INTERVAL_KEYS:
        interval = data_point.get(key)
        if isinstance(interval, dict):
            recorded_at = _parse_rfc3339(interval.get("startTime"))
            if recorded_at:
                break
    if recorded_at is None:
        return None  # MISSING_TIMESTAMP

    # Version — updateTime is RFC3339; promote to epoch-ms int so the
    # version-wins upsert can compare. Absent on simple metrics → None.
    update_time = _parse_rfc3339(data_point.get("updateTime"))
    external_version = (
        int(update_time.timestamp() * 1000) if update_time else None
    )

    try:
        return HealthRecordIn(
            external_id=str(external_id)[:128],
            external_version=external_version,
            metric_type=spec.metric,
            value=value,
            unit=spec.unit,
            recorded_at=recorded_at,
            source=WearableSourceEnum.GOOGLE_HEALTH,
            source_app=source_app,
            recording_method=None,  # confirm if v4 exposes a provenance field
            is_deleted=False,
        )
    except Exception:
        return None  # VALIDATION (range/negative/etc.)

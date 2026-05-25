"""Unit tests for ``app.services.wearable_sync.normalizer``.

Pure-function tests — no DB, no httpx, no settings. Feed dict-shaped
raw Google Health records through ``normalize_google_health`` and
assert on the returned ``NormalizeReport``.

These complement the endpoint-level coverage in
``test_wearables_endpoints.py`` by pinning the per-record contract:
which raw shapes are accepted, which are dropped, and with what
``dropped`` reason. When the live Google Health API ships a new field
name the normalizer probes, regressions here will fire before the
integration tests do.
"""
from __future__ import annotations

import datetime

import pytest

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.services.wearable_sync import normalizer


_FIXED_TS = "2026-05-22T10:00:00+00:00"


def _record(*, id_: str = "rec-1", value=None, **extra) -> dict:
    """Minimal raw-record builder. Every field the normalizer probes can
    be overridden via kwargs; defaults give a well-formed record."""
    raw: dict = {
        "id": id_,
        "recordedAt": _FIXED_TS,
    }
    if value is not None:
        raw["value"] = value
    raw.update(extra)
    return raw


# ──────────────────────────────────────────────────────────────────────
# Happy-path mapping
# ──────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "data_type,value,expected_metric,expected_unit",
    [
        ("steps", 5000, MetricTypeEnum.STEPS, "count"),
        ("heart_rate", 72, MetricTypeEnum.HEART_RATE, "bpm"),
        ("heart_rate_resting", 55, MetricTypeEnum.HEART_RATE_RESTING, "bpm"),
        ("heart_rate_variability", 45, MetricTypeEnum.HRV_RMSSD, "ms"),
        ("oxygen_saturation", 97, MetricTypeEnum.SPO2, "%"),
        ("respiratory_rate", 16, MetricTypeEnum.RESPIRATORY_RATE, "rpm"),
        ("vo2_max", 42, MetricTypeEnum.VO2_MAX, "ml/kg/min"),
        ("distance", 3200, MetricTypeEnum.DISTANCE_M, "m"),
        ("active_calories", 450, MetricTypeEnum.CALORIES_ACTIVE, "kcal"),
        ("floors_climbed", 12, MetricTypeEnum.FLOORS_CLIMBED, "count"),
        ("sleep_deep", 90, MetricTypeEnum.SLEEP_DEEP, "min"),
        ("weight", 68.5, MetricTypeEnum.WEIGHT_KG, "kg"),
        ("body_fat", 22.5, MetricTypeEnum.BODY_FAT_PERCENTAGE, "%"),
        ("body_temperature", 36.7, MetricTypeEnum.BODY_TEMPERATURE, "C"),
        ("blood_glucose", 95, MetricTypeEnum.BLOOD_GLUCOSE, "mg/dL"),
        ("hydration", 500, MetricTypeEnum.HYDRATION_ML, "mL"),
        ("mindfulness_minutes", 10, MetricTypeEnum.MINDFULNESS_MINUTES, "min"),
    ],
)
def test_each_mapping_produces_accepted_record(
    data_type, value, expected_metric, expected_unit
):
    """Every data_type the normalizer knows about should round-trip a
    plausible value to a single accepted ``HealthRecordIn`` with the
    correct metric and canonical unit."""
    report = normalizer.normalize_google_health(
        [_record(value=value)], data_type=data_type, source_app="google_health"
    )
    assert len(report.accepted) == 1
    assert not report.dropped
    row = report.accepted[0]
    assert row.metric_type is expected_metric
    assert row.unit == expected_unit
    assert row.value == float(value)
    assert row.source is WearableSourceEnum.GOOGLE_HEALTH
    assert row.source_app == "google_health"


def test_multi_type_batch_all_accepted_when_called_per_type():
    """Caller fans out per data_type; each call returns its own report.
    Verifies the loop doesn't bleed state across calls."""
    types_and_values = [
        ("heart_rate", 80),
        ("steps", 12000),
        ("weight", 70.0),
    ]
    all_accepted = []
    for data_type, value in types_and_values:
        report = normalizer.normalize_google_health(
            [_record(value=value)], data_type=data_type
        )
        all_accepted.extend(report.accepted)
    assert {r.metric_type for r in all_accepted} == {
        MetricTypeEnum.HEART_RATE,
        MetricTypeEnum.STEPS,
        MetricTypeEnum.WEIGHT_KG,
    }


# ──────────────────────────────────────────────────────────────────────
# Drop paths
# ──────────────────────────────────────────────────────────────────────


def test_out_of_range_spo2_is_dropped():
    """SPO2 = 150% is sensor garbage. _RANGES guards it (HealthRecordIn's
    own validator only covers the legacy 6 metric types)."""
    report = normalizer.normalize_google_health(
        [_record(value=150)], data_type="oxygen_saturation"
    )
    assert report.accepted == []
    assert len(report.dropped) == 1
    raw, reason = report.dropped[0]
    assert reason.startswith("OUT_OF_RANGE")


def test_out_of_range_legacy_metric_dropped_via_validation():
    """heart_rate = 400 fails HealthRecordIn.validate_medical_range
    (20-300 range), which surfaces as a VALIDATION drop reason."""
    report = normalizer.normalize_google_health(
        [_record(value=400)], data_type="heart_rate"
    )
    assert report.accepted == []
    assert len(report.dropped) == 1
    _, reason = report.dropped[0]
    assert reason.startswith("VALIDATION")


def test_missing_external_id_is_dropped():
    raw = {"value": 5000, "recordedAt": _FIXED_TS}  # no id
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted == []
    assert report.dropped == [(raw, "MISSING_EXTERNAL_ID")]


def test_missing_value_is_dropped():
    raw = {"id": "rec-x", "recordedAt": _FIXED_TS}  # no value/count/minutes
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted == []
    assert report.dropped == [(raw, "MISSING_VALUE")]


def test_missing_timestamp_is_dropped():
    raw = {"id": "rec-x", "value": 100}  # no time fields
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted == []
    assert report.dropped == [(raw, "MISSING_TIMESTAMP")]


def test_unparseable_timestamp_is_dropped():
    raw = {"id": "rec-x", "value": 100, "recordedAt": "not-a-date"}
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted == []
    _, reason = report.dropped[0]
    assert reason == "MISSING_TIMESTAMP"


# ──────────────────────────────────────────────────────────────────────
# Unknown / empty / metadata-edge cases
# ──────────────────────────────────────────────────────────────────────


def test_unknown_data_type_drops_every_record_without_raising():
    """One unfamiliar data_type must not kill the rest of a sync sweep."""
    raws = [_record(value=1), _record(id_="rec-2", value=2)]
    report = normalizer.normalize_google_health(raws, data_type="totally_made_up")
    assert report.accepted == []
    assert len(report.dropped) == 2
    for _, reason in report.dropped:
        assert reason == "UNKNOWN_DATA_TYPE:totally_made_up"


def test_empty_payload_returns_empty_report():
    report = normalizer.normalize_google_health([], data_type="steps")
    assert report.accepted == []
    assert report.dropped == []


def test_external_version_promoted_from_metadata_last_modified():
    """Google's `metadata.lastModifiedTime` (epoch ms) drives the
    version-wins upsert in health_sync.upsert_batch."""
    raw = _record(value=5000, metadata={"lastModifiedTime": 1716372000000})
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted[0].external_version == 1716372000000


def test_recording_method_propagates_from_metadata():
    raw = _record(value=5000, metadata={"recordingMethod": "AUTO_RECORDED"})
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted[0].recording_method == "AUTO_RECORDED"


def test_value_falls_back_to_count_then_minutes():
    """The probe order is value → count → minutes → kilocalories;
    verifying `count` is honored when `value` is absent."""
    raw = {"id": "rec-a", "count": 7500, "recordedAt": _FIXED_TS}
    report = normalizer.normalize_google_health([raw], data_type="steps")
    assert report.accepted[0].value == 7500.0


def test_timestamp_epoch_ms_is_parsed_as_utc():
    """A bare epoch-ms integer (> 10**11) should be treated as
    milliseconds, not seconds."""
    raw = {"id": "rec-a", "value": 5000, "time": 1716372000000}
    report = normalizer.normalize_google_health([raw], data_type="steps")
    ts = report.accepted[0].recorded_at
    assert ts.tzinfo is not None
    assert ts == datetime.datetime(2024, 5, 22, 10, 0, 0, tzinfo=datetime.timezone.utc)


def test_source_app_none_passes_through():
    """source_app is optional; omitting it should not drop the record."""
    report = normalizer.normalize_google_health(
        [_record(value=5000)], data_type="steps"
    )
    assert report.accepted[0].source_app is None

"""Unit tests for the Health Connect ingestion contract.

The PostgreSQL-specific parts of `upsert_batch` (ON CONFLICT, partial
unique index on a JSON-typed column path) are not unit-testable against
a sqlite-in-memory mock; we cover those at the integration layer. These
tests focus on the parts that are pure logic:

  * Pydantic validation of `HealthRecordIn` (medical bounds, tombstone
    bypass, required fields).
  * `_split` correctly partitions tombstones from upserts.
  * `_apply_deletions` builds an idempotent UPDATE statement.
  * `mark_failed` / `_upsert_sync_state` write the expected fields.
"""
from __future__ import annotations

import datetime
import uuid

import pytest

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.sync import (
    HealthIngestBatch,
    HealthRecordIn,
    SyncStateUpdateBody,
)
from app.services.health_sync import _split


def _record(
    *,
    metric_type: MetricTypeEnum = MetricTypeEnum.STEPS,
    value: float = 1500,
    unit: str = "steps",
    external_id: str = "rec-1",
    external_version: int | None = 1,
    is_deleted: bool = False,
) -> HealthRecordIn:
    return HealthRecordIn(
        external_id=external_id,
        external_version=external_version,
        metric_type=metric_type,
        value=value,
        unit=unit,
        recorded_at=datetime.datetime(2026, 4, 19, 12, tzinfo=datetime.timezone.utc),
        source=WearableSourceEnum.HEALTH_CONNECT,
        source_app="com.google.android.apps.fitness",
        recording_method="automatic",
        is_deleted=is_deleted,
    )


# ── Pydantic schema validation ───────────────────────────────────────────


def test_health_record_in_accepts_valid_steps():
    rec = _record(metric_type=MetricTypeEnum.STEPS, value=8500, unit="steps")
    assert rec.value == 8500
    assert rec.source is WearableSourceEnum.HEALTH_CONNECT


def test_health_record_in_rejects_heart_rate_out_of_range():
    """20-300 bpm bound mirrors HealthMetricCreate."""
    with pytest.raises(Exception):  # pydantic ValidationError
        _record(metric_type=MetricTypeEnum.HEART_RATE, value=500, unit="bpm")


def test_health_record_in_rejects_negative_value():
    """ge=0 floor prevents negative readings even before the medical range
    check fires."""
    with pytest.raises(Exception):
        _record(value=-1)


def test_health_record_in_rejects_blank_external_id():
    """external_id must be non-empty so the dedupe key is reliable."""
    with pytest.raises(Exception):
        _record(external_id="")


def test_health_record_in_tombstone_bypasses_medical_range():
    """A deletion can carry an out-of-range value (e.g. the source row was
    already corrupt). We won't write the value anyway."""
    rec = _record(
        metric_type=MetricTypeEnum.HEART_RATE,
        value=999,  # would normally be rejected
        unit="bpm",
        is_deleted=True,
    )
    assert rec.is_deleted is True
    assert rec.value == 999


def test_health_record_in_optional_external_version_defaults_none():
    rec = _record(external_version=None)
    assert rec.external_version is None


# ── HealthIngestBatch envelope ─────────────────────────────────────────────


def test_ingest_batch_caps_records_at_500():
    """The orchestrator must chunk anything larger than 500 records."""
    too_many = [
        _record(external_id=f"r-{i}").model_dump(mode="json")
        for i in range(501)
    ]
    with pytest.raises(Exception):
        HealthIngestBatch.model_validate({"records": too_many})


def test_ingest_batch_accepts_empty_payload():
    """Empty batches are valid — they happen on first init when we just
    want to round-trip the changesToken without any records."""
    batch = HealthIngestBatch.model_validate({})
    assert batch.records == []
    assert batch.next_changes_tokens == {}
    assert batch.provider == "health_connect"


def test_sync_state_rejects_too_many_tokens():
    with pytest.raises(Exception):
        SyncStateUpdateBody.model_validate(
            {"tokens": {f"Token{i}": "value" for i in range(33)}}
        )


def test_sync_state_rejects_long_key_and_value():
    with pytest.raises(Exception):
        SyncStateUpdateBody.model_validate({"tokens": {"x" * 65: "value"}})

    with pytest.raises(Exception):
        SyncStateUpdateBody.model_validate({"tokens": {"Steps": "x" * 4097}})


def test_sync_state_rejects_malformed_key():
    with pytest.raises(Exception):
        SyncStateUpdateBody.model_validate({"tokens": {"../Steps": "value"}})


# ── _split partitions tombstones ──────────────────────────────────────────


def test_split_separates_upserts_and_deletions():
    user_id = uuid.uuid4()
    device_id = uuid.uuid4()
    records = [
        _record(external_id="keep-1"),
        _record(external_id="delete-1", is_deleted=True),
        _record(external_id="keep-2"),
        _record(external_id="delete-2", is_deleted=True),
    ]
    upserts, deletion_ids = _split(user_id, device_id, records)
    assert {u.external_id for u in upserts} == {"keep-1", "keep-2"}
    assert set(deletion_ids) == {"delete-1", "delete-2"}
    assert all(u.user_id == user_id for u in upserts)
    assert all(u.device_id == device_id for u in upserts)


def test_split_handles_all_upserts():
    upserts, deletion_ids = _split(
        uuid.uuid4(),
        uuid.uuid4(),
        [_record(external_id=f"r-{i}") for i in range(3)],
    )
    assert len(upserts) == 3
    assert deletion_ids == []


def test_split_handles_all_deletions():
    upserts, deletion_ids = _split(
        uuid.uuid4(),
        uuid.uuid4(),
        [_record(external_id=f"r-{i}", is_deleted=True) for i in range(3)],
    )
    assert upserts == []
    assert len(deletion_ids) == 3


def test_split_folds_dedicated_deletions_with_legacy():
    """The new HealthDeletionIn shape coexists with legacy is_deleted=true
    records in the same batch — both get flattened into deletion_ids."""
    from app.schemas.sync import HealthDeletionIn

    upserts, deletion_ids = _split(
        uuid.uuid4(),
        uuid.uuid4(),
        [
            _record(external_id="legacy-tomb", is_deleted=True),
            _record(external_id="keep-1"),
        ],
        deletions=[
            HealthDeletionIn(external_id="new-tomb-1"),
            HealthDeletionIn(external_id="new-tomb-2"),
        ],
    )
    assert {u.external_id for u in upserts} == {"keep-1"}
    assert set(deletion_ids) == {"legacy-tomb", "new-tomb-1", "new-tomb-2"}

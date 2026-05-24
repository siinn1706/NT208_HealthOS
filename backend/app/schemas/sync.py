"""Schemas for Health Connect sync ingestion + sync-state endpoints.

The mobile app posts a `HealthIngestBatch` per sync run; the backend
returns a `HealthIngestResult` with per-row counts plus a list of
records that failed validation (so a single bad reading does not poison
the whole batch). The same request can carry the new `changesToken`
values for each record type so we don't need a follow-up call.

Deletions are a separate `HealthDeletionIn` shape (M7 fix) — they only
need the external_id, no fake metric_type / value placeholder.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.core import MetricTypeEnum, WearableSourceEnum
from app.schemas.common import DataResponse


# ── Per-record payload ──────────────────────────────────────────────────

class HealthRecordIn(BaseModel):
    """One record from Health Connect, mapped to HealthOS shape on device.

    For deletions, prefer the dedicated `HealthDeletionIn` shape; the
    `is_deleted` field on this schema is kept for backward compatibility
    with mobile clients that haven't been upgraded yet.
    """

    # The HC `metadata.id` (HealthOS-owned record) or `metadata.clientRecordId`
    # (third-party-owned record). Required so server-side dedupe works.
    external_id: str = Field(min_length=1, max_length=128)
    # HC `clientRecordVersion` when present, otherwise the
    # `lastModifiedTime` epoch ms. Used for "newer wins" upserts.
    external_version: int | None = Field(default=None, ge=0)
    metric_type: MetricTypeEnum
    # Backward-compat tombstone flag. Declared BEFORE `value` because
    # Pydantic v2 evaluates field_validator callbacks in declaration
    # order and the medical-range validator below reads it.
    is_deleted: bool = False
    value: float = Field(ge=0)
    unit: str = Field(min_length=1, max_length=32)
    recorded_at: datetime.datetime
    source: WearableSourceEnum = WearableSourceEnum.HEALTH_CONNECT
    source_app: str | None = Field(default=None, max_length=128)
    recording_method: str | None = Field(default=None, max_length=16)

    @field_validator("external_id")
    @classmethod
    def normalize_external_id(cls, v: str) -> str:
        return v.strip()

    @field_validator("recorded_at")
    @classmethod
    def normalize_recorded_at(cls, v: datetime.datetime) -> datetime.datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=datetime.timezone.utc)
        return v

    @field_validator("source_app", "recording_method")
    @classmethod
    def normalize_optional_text(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None

    @field_validator("value")
    @classmethod
    def validate_medical_range(cls, v: float, info) -> float:
        # Mirror the per-metric medical bounds enforced by
        # `app/schemas/health_metrics.py:HealthMetricCreate` — keeps the
        # ingest contract symmetric with manual entry.
        metric = info.data.get("metric_type")
        ranges = {
            MetricTypeEnum.HEART_RATE: (20, 300),
            MetricTypeEnum.STEPS: (0, 200000),
            MetricTypeEnum.SLEEP_MINUTES: (0, 1440),
            MetricTypeEnum.WEIGHT_KG: (1, 500),
            MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC: (50, 300),
            MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC: (30, 200),
        }
        if metric and metric in ranges:
            lo, hi = ranges[metric]
            # Allow tombstones to bypass the bounds — we won't write the
            # value anyway (only flip is_deleted=true).
            if not info.data.get("is_deleted") and not (lo <= v <= hi):
                raise ValueError(
                    f"value {v} out of medical range [{lo}, {hi}] for {metric.value}"
                )
        return v


class HealthDeletionIn(BaseModel):
    """Tombstone payload — the only thing the deletion service needs is
    the external_id to match against. The legacy `HealthRecordIn` shape
    with `is_deleted=true` continues to work, but new clients should use
    this leaner schema (no fake metric_type / value placeholder).
    """

    external_id: str = Field(min_length=1, max_length=128)

    @field_validator("external_id")
    @classmethod
    def normalize_external_id(cls, v: str) -> str:
        return v.strip()


# ── Batch envelope + per-record-type token bundle ─────────────────────

class HealthIngestBatch(BaseModel):
    """Batch payload posted by the mobile sync orchestrator."""

    # Keep the contract permissive on provider — the URL path already
    # disambiguates the device, this is just for structured logging.
    provider: str = Field(default="health_connect", max_length=32)
    # Cap at 500 so a single batch fits comfortably under the 256 KiB body
    # limit and doesn't lock a row for too long. The orchestrator chunks
    # larger windows on the device side.
    records: list[HealthRecordIn] = Field(default_factory=list, max_length=500)
    # Dedicated deletion list — preferred over `is_deleted=true` records
    # in `records` since v2 of the contract. Both work; the service folds
    # them together at upsert time.
    deletions: list[HealthDeletionIn] = Field(default_factory=list, max_length=500)
    # Map of HC record-type name → next changesToken to persist atomically
    # with the ingest. Keys MUST be one of:
    #   "Steps" | "HeartRate" | "SleepSession" | "Weight"
    #   (stretch) "BloodPressure" | "ExerciseSession"
    next_changes_tokens: dict[str, str] = Field(default_factory=dict)


class HealthIngestErrorRow(BaseModel):
    external_id: str
    reason: str


class HealthIngestResult(BaseModel):
    inserted: int = 0
    updated: int = 0
    deleted: int = 0
    skipped: int = 0
    errors: list[HealthIngestErrorRow] = Field(default_factory=list)


class HealthIngestResponse(DataResponse[HealthIngestResult]):
    ...


# ── Sync-state read/write ────────────────────────────────────────────

class SyncStateEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_type: str
    changes_token: str | None = None
    last_synced_at: datetime.datetime | None = None
    last_attempted_at: datetime.datetime | None = None
    consecutive_failures: int = 0


class SyncStateListResponse(DataResponse[list[SyncStateEntry]]):
    ...


class SyncStateUpdateBody(BaseModel):
    """Caller posts the full bundle of (record_type, token) pairs the
    device just successfully pulled. The service upserts each row and
    leaves untouched record types alone."""

    tokens: dict[str, Optional[str]] = Field(default_factory=dict)

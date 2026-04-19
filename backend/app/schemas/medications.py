"""Medication Hub schemas.

DTOs returned to BFF/FE expose only what the UI needs. Internal-only fields
(`dedupe_key`, raw `created_at`/`updated_at`) are intentionally omitted from
list/detail responses to keep payloads small and forward-compatible.

Validation:
  * `dose_times` is the public-facing dose schedule (1-8 entries, "HH:MM").
    The service expands it into N child reminder rows.
  * Repeat semantics mirror `ReminderRepeatEnum` (once|daily|weekly|monthly).
  * `weekday_mask` / `day_of_month` follow the same conventions as the
    existing reminder schema (bit 0 = Mon … bit 6 = Sun for weekly;
    1-31 or -1 for monthly).
"""
from __future__ import annotations

import datetime
import re
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.common import DataResponse


_TIME_RE = re.compile(r"^\d{2}:\d{2}$")
_VALID_FORMS = {"tablet", "capsule", "liquid", "injection", "drops", "other"}
_VALID_REPEATS = {"once", "daily", "weekly", "monthly"}
_VALID_STATUSES = {"active", "paused", "completed", "cancelled"}


def _canonicalize_dose_times(times: list[str]) -> list[str]:
    """Normalize HH:MM, dedupe, sort. Raises ValueError on bad input."""
    out: set[str] = set()
    for raw in times:
        s = raw.strip()
        if not _TIME_RE.match(s):
            raise ValueError(f"Invalid dose time {s!r}; expected HH:MM.")
        hh, mm = s.split(":")
        if not (0 <= int(hh) <= 23 and 0 <= int(mm) <= 59):
            raise ValueError(f"Out-of-range dose time {s!r}.")
        out.add(f"{int(hh):02d}:{int(mm):02d}")
    return sorted(out)


class MedicationDoseSummary(BaseModel):
    """Lightweight dose row — one entry per child reminder."""

    model_config = ConfigDict(from_attributes=True)

    reminder_id: uuid.UUID
    time: str = Field(description='HH:MM in the plan tzid.')
    repeat: str
    weekday_mask: Optional[int] = None
    day_of_month: Optional[int] = None
    next_occurrence_at: Optional[datetime.datetime] = None
    is_active: bool


class MedicationPlanDTO(BaseModel):
    """Hub-list-row shape — slim by design."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    form: Optional[str] = None
    instructions: Optional[str] = None
    prescriber: Optional[str] = None
    clinic: Optional[str] = None
    start_date: datetime.date
    end_date: Optional[datetime.date] = None
    status: str
    tzid: str
    refill_supply_units: Optional[int] = None
    refill_cadence_days: Optional[int] = None
    last_refill_at: Optional[datetime.datetime] = None
    next_refill_estimated_at: Optional[datetime.datetime] = None
    review_due_at: Optional[datetime.date] = None
    appointment_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    dose_count: int = Field(default=0, description="Number of active child reminders.")
    next_dose_at: Optional[datetime.datetime] = None


class MedicationPlanDetailDTO(MedicationPlanDTO):
    """Detail page payload — adds the actual dose schedule."""

    doses: list[MedicationDoseSummary] = Field(default_factory=list)


class MedicationPlanCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    generic_name: Optional[str] = Field(default=None, max_length=255)
    strength: Optional[str] = Field(default=None, max_length=64)
    form: Optional[str] = Field(default=None, max_length=32)
    instructions: Optional[str] = Field(default=None, max_length=2000)
    prescriber: Optional[str] = Field(default=None, max_length=255)
    clinic: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    tzid: Optional[str] = Field(default=None, max_length=64)
    dose_times: list[str] = Field(min_length=1, max_length=8)
    repeat: str = Field(default="daily")
    weekday_mask: Optional[int] = Field(default=None, ge=0, le=127)
    day_of_month: Optional[int] = Field(default=None, ge=-1, le=31)
    refill_supply_units: Optional[int] = Field(default=None, ge=0, le=100_000)
    refill_cadence_days: Optional[int] = Field(default=None, ge=1, le=365)
    review_due_at: Optional[datetime.date] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    appointment_id: Optional[uuid.UUID] = None

    @field_validator("form")
    @classmethod
    def _check_form(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _VALID_FORMS:
            raise ValueError(f"form must be one of {sorted(_VALID_FORMS)}")
        return v

    @field_validator("repeat")
    @classmethod
    def _check_repeat(cls, v: str) -> str:
        if v not in _VALID_REPEATS:
            raise ValueError(f"repeat must be one of {sorted(_VALID_REPEATS)}")
        return v

    @field_validator("dose_times")
    @classmethod
    def _check_dose_times(cls, v: list[str]) -> list[str]:
        return _canonicalize_dose_times(v)

    @model_validator(mode="after")
    def _check_dates(self) -> "MedicationPlanCreateBody":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class MedicationPlanUpdateBody(BaseModel):
    """Partial update. Schedule changes (`dose_times`, `repeat`, etc.) require
    rebuilding child reminders — handled in the service layer."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    generic_name: Optional[str] = Field(default=None, max_length=255)
    strength: Optional[str] = Field(default=None, max_length=64)
    form: Optional[str] = Field(default=None, max_length=32)
    instructions: Optional[str] = Field(default=None, max_length=2000)
    prescriber: Optional[str] = Field(default=None, max_length=255)
    clinic: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    tzid: Optional[str] = Field(default=None, max_length=64)
    dose_times: Optional[list[str]] = Field(default=None, min_length=1, max_length=8)
    repeat: Optional[str] = None
    weekday_mask: Optional[int] = Field(default=None, ge=0, le=127)
    day_of_month: Optional[int] = Field(default=None, ge=-1, le=31)
    review_due_at: Optional[datetime.date] = None
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("form")
    @classmethod
    def _check_form(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _VALID_FORMS:
            raise ValueError(f"form must be one of {sorted(_VALID_FORMS)}")
        return v

    @field_validator("repeat")
    @classmethod
    def _check_repeat(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in _VALID_REPEATS:
            raise ValueError(f"repeat must be one of {sorted(_VALID_REPEATS)}")
        return v

    @field_validator("dose_times")
    @classmethod
    def _check_dose_times(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return None
        return _canonicalize_dose_times(v)


class MedicationRefillBody(BaseModel):
    supply_units: int = Field(ge=0, le=100_000)
    refilled_at: Optional[datetime.datetime] = None


class AdherenceDTO(BaseModel):
    period_days: int
    scheduled: int
    taken: int
    skipped: int
    missed: int
    snoozed_pending: int
    pending: int
    percent: int = Field(description="0–100 (taken / scheduled), 0 when scheduled is 0.")


class MedicationDoseDTO(BaseModel):
    """Today's-doses-panel payload — one row per scheduled occurrence today."""

    model_config = ConfigDict(from_attributes=True)

    occurrence_id: uuid.UUID
    reminder_id: uuid.UUID
    medication_plan_id: uuid.UUID
    plan_name: str
    strength: Optional[str] = None
    scheduled_at: datetime.datetime
    status: str


class MedicationImportBody(BaseModel):
    """Optional defaults applied to every imported medicine when the
    appointment's `frequency` text can't be parsed reliably.

    `medicine_indices` lets the FE filter the import to a subset of the
    appointment's medicines (e.g. user un-checks "Aspirin" in the import
    dialog). Omitting the field imports every medicine in the prescription
    array — preserves the original "import all" behavior for any caller
    that doesn't know about the new filter.
    """

    default_dose_times: Optional[list[str]] = Field(default=None, min_length=1, max_length=8)
    default_repeat: str = Field(default="daily")
    medicine_indices: Optional[list[int]] = Field(default=None, max_length=64)

    @field_validator("default_repeat")
    @classmethod
    def _check_repeat(cls, v: str) -> str:
        if v not in _VALID_REPEATS:
            raise ValueError(f"default_repeat must be one of {sorted(_VALID_REPEATS)}")
        return v

    @field_validator("default_dose_times")
    @classmethod
    def _check_dose_times(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return None
        return _canonicalize_dose_times(v)

    @field_validator("medicine_indices")
    @classmethod
    def _check_indices(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is None:
            return None
        # Reject negatives and duplicates; keep order-stable.
        seen: set[int] = set()
        out: list[int] = []
        for i in v:
            if not isinstance(i, int) or i < 0:
                raise ValueError(f"medicine_indices entries must be non-negative integers")
            if i in seen:
                continue
            seen.add(i)
            out.append(i)
        return out


class MedicationImportSkipped(BaseModel):
    medicine_index: int
    name: str
    reason: str
    existing_plan_id: Optional[uuid.UUID] = None


class MedicationImportResult(BaseModel):
    created: list[MedicationPlanDTO]
    skipped: list[MedicationImportSkipped]


class MedicationStatusFilter(BaseModel):
    """Helper for tighter Query() typing — not currently used but kept for parity."""

    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _check(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "all":
            return v
        if v not in _VALID_STATUSES:
            raise ValueError(f"status must be one of {sorted(_VALID_STATUSES)} or 'all'")
        return v


# ── Response envelopes ──
class MedicationPlanResponse(DataResponse[MedicationPlanDTO]):
    ...


class MedicationPlanDetailResponse(DataResponse[MedicationPlanDetailDTO]):
    ...


class MedicationPlanListResponse(DataResponse[list[MedicationPlanDTO]]):
    ...


class MedicationDoseListResponse(DataResponse[list[MedicationDoseDTO]]):
    ...


class AdherenceResponse(DataResponse[AdherenceDTO]):
    ...


class MedicationImportResponse(DataResponse[MedicationImportResult]):
    ...


__all__ = [
    "AdherenceDTO",
    "AdherenceResponse",
    "MedicationDoseDTO",
    "MedicationDoseListResponse",
    "MedicationDoseSummary",
    "MedicationImportBody",
    "MedicationImportResponse",
    "MedicationImportResult",
    "MedicationImportSkipped",
    "MedicationPlanCreateBody",
    "MedicationPlanDTO",
    "MedicationPlanDetailDTO",
    "MedicationPlanDetailResponse",
    "MedicationPlanListResponse",
    "MedicationPlanResponse",
    "MedicationPlanUpdateBody",
    "MedicationRefillBody",
    "MedicationStatusFilter",
    "_canonicalize_dose_times",
]

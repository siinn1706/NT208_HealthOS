"""Pydantic schemas for the Pre-Visit Brief feature.

DTOs map cleanly to the ORM in `app.models.visit_briefs`. Literal types are
the contract source of truth — both BE validation and OpenAPI codegen will
honor them.

Naming convention matches the existing repo:

  *  `XxxDTO`            — outgoing payload (`from_attributes=True`)
  *  `XxxCreateBody`     — incoming POST body
  *  `XxxUpdateBody`     — incoming PATCH body
  *  `XxxResponse`       — `DataResponse[XxxDTO]` envelope
  *  `XxxListResponse`   — paginated envelope

Caps mirror the service-layer enforcement noted in the plan §5.3:

  *  Max 5 symptoms per brief, 10 questions per question_set.
  *  `concern_text` 1..500, free-text fields up to 1000 chars.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse, PaginatedResponse


# Mirrors the Python enums in app.models.visit_briefs. Pydantic Literal here
# (instead of importing the enum) keeps the OpenAPI schema clean and lets the
# FE generate matching TypeScript string unions.
VisitTypeLiteral = Literal[
    "gp_routine",
    "specialist",
    "follow_up",
    "mental_health",
    "urgent_walkin",
    "pediatric_caregiver",
]
VisitBriefStatusLiteral = Literal["draft", "finalized", "archived"]
ConcernCategoryLiteral = Literal[
    "pain",
    "fever",
    "gi",
    "resp",
    "mental",
    "skin",
    "neuro",
    "cardio",
    "other",
]
DurationUnitLiteral = Literal["hours", "days", "weeks", "months"]
TriageBucketLiteral = Literal[
    "emergency_now",
    "urgent_same_day",
    "routine_gp",
    "self_care_with_monitoring",
    "insufficient_info",
]


# ─────────────────────────────────────────────────────────────────────────────
# Symptom entry
# ─────────────────────────────────────────────────────────────────────────────


class SymptomEntryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visit_brief_id: uuid.UUID
    concern_text: str
    concern_category: ConcernCategoryLiteral
    onset_date: Optional[datetime.date] = None
    duration_value: Optional[int] = None
    duration_unit: Optional[DurationUnitLiteral] = None
    severity_0_10: Optional[int] = None
    triggers: Optional[str] = None
    better_with: Optional[str] = None
    worse_with: Optional[str] = None
    meds_taken: Optional[str] = None
    prior_care: Optional[str] = None
    context: Optional[dict[str, Any]] = None
    order_index: int = 0


class SymptomEntryCreateBody(BaseModel):
    concern_text: str = Field(min_length=1, max_length=500)
    concern_category: ConcernCategoryLiteral = "other"
    onset_date: Optional[datetime.date] = None
    duration_value: Optional[int] = Field(default=None, ge=0, le=365 * 5)
    duration_unit: Optional[DurationUnitLiteral] = None
    severity_0_10: Optional[int] = Field(default=None, ge=0, le=10)
    triggers: Optional[str] = Field(default=None, max_length=1000)
    better_with: Optional[str] = Field(default=None, max_length=1000)
    worse_with: Optional[str] = Field(default=None, max_length=1000)
    meds_taken: Optional[str] = Field(default=None, max_length=1000)
    prior_care: Optional[str] = Field(default=None, max_length=1000)
    context: Optional[dict[str, Any]] = None


class SymptomEntryUpdateBody(BaseModel):
    """Partial update — every field optional. Pydantic distinguishes
    `field=None` (clear) from field-not-provided via `model_dump(exclude_unset=True)`
    in the service layer."""

    concern_text: Optional[str] = Field(default=None, min_length=1, max_length=500)
    concern_category: Optional[ConcernCategoryLiteral] = None
    onset_date: Optional[datetime.date] = None
    duration_value: Optional[int] = Field(default=None, ge=0, le=365 * 5)
    duration_unit: Optional[DurationUnitLiteral] = None
    severity_0_10: Optional[int] = Field(default=None, ge=0, le=10)
    triggers: Optional[str] = Field(default=None, max_length=1000)
    better_with: Optional[str] = Field(default=None, max_length=1000)
    worse_with: Optional[str] = Field(default=None, max_length=1000)
    meds_taken: Optional[str] = Field(default=None, max_length=1000)
    prior_care: Optional[str] = Field(default=None, max_length=1000)
    context: Optional[dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Triage outcome
# ─────────────────────────────────────────────────────────────────────────────


class MatchedSignal(BaseModel):
    """One entry in `TriageOutcome.matched_signals`.

    `severity` maps to TRIAGE_BUCKET_SEVERITY in the engine; copy_key is the
    i18n key the FE renders. We keep raw signal text short and PHI-free —
    never the user's entire concern_text.
    """

    rule_id: str
    signal: str
    severity: int
    copy_key: str
    bucket: TriageBucketLiteral


class TriageOutcomeDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visit_brief_id: uuid.UUID
    ruleset_version: str
    bucket: TriageBucketLiteral
    matched_signals: list[dict[str, Any]] = Field(default_factory=list)
    inputs_hash: str
    disclaimer_version: str
    next_action_copy_key: Optional[str] = None
    computed_at: datetime.datetime


class TriageOutcomeListResponse(DataResponse[list[TriageOutcomeDTO]]):
    ...


# ─────────────────────────────────────────────────────────────────────────────
# Question set + templates
# ─────────────────────────────────────────────────────────────────────────────


class QuestionItem(BaseModel):
    """One question in a `QuestionSet.questions` JSONB array.

    `source='template'` items came from `question_templates` (id is the
    template slug). `source='custom'` items are user-typed (id is a fresh
    UUID minted client-side or by the service layer).

    `locked=true` items can be reordered but never edited or removed —
    used for the four canonical Healthwatch questions.
    """

    id: str
    source: Literal["template", "custom"]
    text_vi: str = Field(min_length=1, max_length=500)
    text_en: str = Field(min_length=1, max_length=500)
    order: int = Field(ge=0)
    locked: bool = False


class QuestionSetDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visit_brief_id: uuid.UUID
    questions: list[QuestionItem] = Field(default_factory=list)
    updated_at: datetime.datetime


class QuestionSetReplaceBody(BaseModel):
    """Whole-list replacement — simpler contract than individual add/remove
    endpoints, and the list is always small enough to round-trip in one PATCH.
    """

    questions: list[QuestionItem] = Field(min_length=0, max_length=10)


class QuestionTemplateDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    visit_type: Optional[VisitTypeLiteral] = None
    concern_category: Optional[ConcernCategoryLiteral] = None
    text_vi: str
    text_en: str
    default_order: int
    is_canonical: bool


class QuestionTemplateListResponse(DataResponse[list[QuestionTemplateDTO]]):
    ...


# ─────────────────────────────────────────────────────────────────────────────
# Appointment link
# ─────────────────────────────────────────────────────────────────────────────


class AppointmentBriefLinkDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    visit_brief_id: uuid.UUID
    appointment_id: uuid.UUID
    is_active: bool
    attached_at: datetime.datetime
    detached_at: Optional[datetime.datetime] = None


class AttachBriefBody(BaseModel):
    appointment_id: uuid.UUID


class AppointmentBriefLinkResponse(DataResponse[AppointmentBriefLinkDTO]):
    ...


# ─────────────────────────────────────────────────────────────────────────────
# Visit brief (header + nested DTOs)
# ─────────────────────────────────────────────────────────────────────────────


class VisitBriefDTO(BaseModel):
    """Shallow header only — used in list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    visit_type: VisitTypeLiteral
    status: VisitBriefStatusLiteral
    revision: int
    title: Optional[str] = None
    finalized_at: Optional[datetime.datetime] = None
    archived_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class VisitBriefDetailDTO(VisitBriefDTO):
    """Full hydrated brief — used in single-resource endpoints.

    `latest_triage` is the most-recent `TriageOutcome` row (or null if the
    brief has no symptoms yet). `question_set` is the 1:1 question-set row
    (or null on a brand-new draft). `appointment_links` includes both active
    and historical attachments so the FE can render the full audit trail.
    """

    symptoms: list[SymptomEntryDTO] = Field(default_factory=list)
    latest_triage: Optional[TriageOutcomeDTO] = None
    question_set: Optional[QuestionSetDTO] = None
    appointment_links: list[AppointmentBriefLinkDTO] = Field(default_factory=list)


class VisitBriefCreateBody(BaseModel):
    visit_type: VisitTypeLiteral = "gp_routine"
    title: Optional[str] = Field(default=None, max_length=255)
    # Optional convenience: pre-attach to an upcoming appointment in one call.
    attach_to_appointment_id: Optional[uuid.UUID] = None
    # Review fix T1 — "Create new revision" flow. When set, the new brief
    # copies symptoms + question_set from the source brief (scoped by user)
    # and starts at `source.revision + 1`. Source remains untouched.
    clone_from_brief_id: Optional[uuid.UUID] = None


class VisitBriefUpdateBody(BaseModel):
    visit_type: Optional[VisitTypeLiteral] = None
    title: Optional[str] = Field(default=None, max_length=255)


# ─────────────────────────────────────────────────────────────────────────────
# Envelopes
# ─────────────────────────────────────────────────────────────────────────────


class VisitBriefResponse(DataResponse[VisitBriefDetailDTO]):
    ...


class VisitBriefListResponse(PaginatedResponse[VisitBriefDTO]):
    ...


class SymptomEntryResponse(DataResponse[SymptomEntryDTO]):
    ...


class TriageOutcomeResponse(DataResponse[TriageOutcomeDTO]):
    ...


class QuestionSetResponse(DataResponse[QuestionSetDTO]):
    ...

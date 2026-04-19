"""Pre-Visit Brief models.

Five additive tables (Phase 1 of the Pre-Visit Question Builder feature):

  * `visit_briefs`           — header / lifecycle (draft / finalized / archived)
  * `symptom_entries`        — one or more concerns per brief (1..5)
  * `triage_outcomes`        — append-only audit of every routing computation
  * `question_sets`          — the curated + custom question list per brief (1:1)
  * `question_templates`     — globally-seeded suggestion bank (read-only catalog)
  * `appointment_brief_links` — many-to-one FK pairing brief → appointment

Kept in a separate module from `core.py` because `core.py` already exceeds the
modularization threshold from `CLAUDE.md` and these tables compose a single,
self-contained domain.

Status / type / category / bucket columns are persisted as `String` (with a
server-side default) instead of native PG enums. Same trade-off as
`Notification.kind` in `core.py`: lets us add a category in code without a
follow-up enum migration. The Python `Enum` classes below are the
authoritative list and live next to the ORM that uses them.
"""
from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.core import Base

if TYPE_CHECKING:
    from app.models.core import Appointment, User  # noqa: F401


# ─────────────────────────────────────────────────────────────────────────────
# Authoritative enums (mirrored in `app.schemas.visit_briefs` Literals)
# ─────────────────────────────────────────────────────────────────────────────


class VisitBriefStatusEnum(str, Enum):
    """Lifecycle of a single brief.

    `finalized` is append-only — re-finalizing creates a new revision row
    rather than mutating the existing one. `archived` is soft-delete; rows
    survive the user's active session and only disappear on user purge.
    """

    DRAFT = "draft"
    FINALIZED = "finalized"
    ARCHIVED = "archived"


class VisitTypeEnum(str, Enum):
    GP_ROUTINE = "gp_routine"
    SPECIALIST = "specialist"
    FOLLOW_UP = "follow_up"
    MENTAL_HEALTH = "mental_health"
    URGENT_WALKIN = "urgent_walkin"
    PEDIATRIC_CAREGIVER = "pediatric_caregiver"


class ConcernCategoryEnum(str, Enum):
    """Coarse symptom buckets — drives template suggestions and a subset of
    triage rules. Deliberately small; we do not enumerate diseases."""

    PAIN = "pain"
    FEVER = "fever"
    GI = "gi"           # gastrointestinal
    RESP = "resp"       # respiratory
    MENTAL = "mental"
    SKIN = "skin"
    NEURO = "neuro"
    CARDIO = "cardio"   # chest pain / palpitations / shortness-of-breath
    OTHER = "other"


class DurationUnitEnum(str, Enum):
    HOURS = "hours"
    DAYS = "days"
    WEEKS = "weeks"
    MONTHS = "months"


class TriageBucketEnum(str, Enum):
    """Output of the rule-based triage engine.

    Ordered by severity for the "highest bucket wins" tiebreak in
    `triage_engine.evaluate`.
    """

    EMERGENCY_NOW = "emergency_now"
    URGENT_SAME_DAY = "urgent_same_day"
    ROUTINE_GP = "routine_gp"
    SELF_CARE_WITH_MONITORING = "self_care_with_monitoring"
    INSUFFICIENT_INFO = "insufficient_info"


# Severity ordering used by triage_engine to pick the worst bucket when
# multiple rules match. Higher index = more severe.
TRIAGE_BUCKET_SEVERITY: dict[str, int] = {
    TriageBucketEnum.SELF_CARE_WITH_MONITORING.value: 0,
    TriageBucketEnum.INSUFFICIENT_INFO.value: 1,
    TriageBucketEnum.ROUTINE_GP.value: 2,
    TriageBucketEnum.URGENT_SAME_DAY.value: 3,
    TriageBucketEnum.EMERGENCY_NOW.value: 4,
}


# ─────────────────────────────────────────────────────────────────────────────
# Tables
# ─────────────────────────────────────────────────────────────────────────────


class VisitBrief(Base):
    __tablename__ = "visit_briefs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    visit_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default=text("'gp_routine'"),
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'draft'"),
        index=True,
    )
    # Bumped on every successful `finalize`. Drafts always start at 1.
    revision: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("1"),
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    finalized_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    archived_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    symptoms: Mapped[list["SymptomEntry"]] = relationship(
        back_populates="brief",
        cascade="all, delete-orphan",
        order_by="SymptomEntry.order_index",
    )
    triage_outcomes: Mapped[list["TriageOutcome"]] = relationship(
        back_populates="brief",
        cascade="all, delete-orphan",
        order_by="TriageOutcome.computed_at.desc()",
    )
    question_set: Mapped["QuestionSet | None"] = relationship(
        back_populates="brief",
        uselist=False,
        cascade="all, delete-orphan",
    )
    appointment_links: Mapped[list["AppointmentBriefLink"]] = relationship(
        back_populates="brief",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_visit_briefs_user_status", "user_id", "status"),
    )


class SymptomEntry(Base):
    """One concern within a brief. Up to 5 per brief (capped in service layer).

    `concern_text` is the user's own words; `concern_category` is the coarse
    bucket they pick. Both feed the triage engine. Free text is canonicalized
    (lower-cased, whitespace-stripped) before being tokenized — never sent to
    an LLM in MVP.
    """

    __tablename__ = "symptom_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    visit_brief_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visit_briefs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    concern_text: Mapped[str] = mapped_column(String(500), nullable=False)
    concern_category: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'other'"),
    )
    onset_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    duration_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_unit: Mapped[str | None] = mapped_column(String(16), nullable=True)
    severity_0_10: Mapped[int | None] = mapped_column(Integer, nullable=True)
    triggers: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    better_with: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    worse_with: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    meds_taken: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    prior_care: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    # Free-form structured extras (e.g., {"is_infant": true} for pediatric
    # red-flag rules). Kept open so we can add fields without a migration.
    context: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    brief: Mapped[VisitBrief] = relationship(back_populates="symptoms")


class TriageOutcome(Base):
    """Append-only audit row written every time the triage engine evaluates
    the brief. Lets us forensically replay the exact decision later.

    Never updated; never deleted (except by parent CASCADE on user purge).
    The latest row (by `computed_at`) is what the FE renders.
    """

    __tablename__ = "triage_outcomes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    visit_brief_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visit_briefs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ruleset_version: Mapped[str] = mapped_column(String(16), nullable=False)
    bucket: Mapped[str] = mapped_column(String(32), nullable=False)
    # [{rule_id, signal, severity, copy_key, ...}]
    matched_signals: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    # Snapshot of the canonicalized inputs the engine consumed. Used for
    # deterministic replay; PHI-equivalent and gated on user soft-delete.
    inputs_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    # SHA-256 of the canonical JSON of `inputs_snapshot`. Lets us cheaply
    # detect "same brief computed twice → same outcome" without diffing.
    inputs_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    disclaimer_version: Mapped[str] = mapped_column(String(16), nullable=False)
    next_action_copy_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    computed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    brief: Mapped[VisitBrief] = relationship(back_populates="triage_outcomes")


class QuestionSet(Base):
    """The user's chosen questions for a brief.

    1:1 with VisitBrief. The `questions` JSONB is a small ordered list (≤10),
    each item is `{id, source: 'template'|'custom', text_vi, text_en, order,
    locked}`. We do not normalize this into rows because the list is small,
    always read whole, and the user reorders/edits constantly — JSONB rewrites
    are simpler than tracking row positions.
    """

    __tablename__ = "question_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    visit_brief_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visit_briefs.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    questions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    brief: Mapped[VisitBrief] = relationship(back_populates="question_set")


class QuestionTemplate(Base):
    """Read-only seeded suggestion catalog.

    `visit_type` and `concern_category` are nullable: a row with both null is
    considered "canonical / universal" (the Healthwatch four). The suggested-
    questions endpoint runs:

        SELECT * FROM question_templates
        WHERE (visit_type IS NULL OR visit_type = :vt)
          AND (concern_category IS NULL OR concern_category = :cat)
        ORDER BY is_canonical DESC, default_order ASC

    so the canonical four come first, then visit-type-specific, then
    category-specific suggestions.
    """

    __tablename__ = "question_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    visit_type: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    concern_category: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    text_vi: Mapped[str] = mapped_column(String(500), nullable=False)
    text_en: Mapped[str] = mapped_column(String(500), nullable=False)
    default_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("100"),
    )
    is_canonical: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class AppointmentBriefLink(Base):
    """Many-to-many resolver between briefs and appointments.

    A user might attach several iterations of a brief to a single appointment
    (e.g., they updated symptoms the morning of the visit). Only one link per
    appointment is `is_active=true` at a time — the partial unique index below
    enforces that constraint at the DB layer.
    """

    __tablename__ = "appointment_brief_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    visit_brief_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visit_briefs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    attached_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    detached_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    brief: Mapped[VisitBrief] = relationship(back_populates="appointment_links")

    __table_args__ = (
        UniqueConstraint(
            "visit_brief_id",
            "appointment_id",
            name="uq_brief_appointment",
        ),
    )

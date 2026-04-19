from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, Time, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.health_goal import HealthGoal  # noqa: F401


class Base(DeclarativeBase):
    """Base class for all ORM models."""


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MealStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    ANALYZED = "analyzed"
    FAILED = "failed"


class MetricTypeEnum(str, Enum):
    HEART_RATE = "heart_rate"
    STEPS = "steps"
    SLEEP_MINUTES = "sleep_minutes"
    WEIGHT_KG = "weight_kg"
    BLOOD_PRESSURE_SYSTOLIC = "blood_pressure_systolic"
    BLOOD_PRESSURE_DIASTOLIC = "blood_pressure_diastolic"


class WearableSourceEnum(str, Enum):
    MANUAL = "manual"
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT = "google_fit"
    GARMIN = "garmin"
    FITBIT = "fitbit"


class WearableProviderEnum(str, Enum):
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT = "google_fit"
    GARMIN = "garmin"
    FITBIT = "fitbit"


class AppointmentStatusEnum(str, Enum):
    """Appointment lifecycle states.

    State machine (B7):
        booked → scheduled → upcoming → in_progress → completed
        any   → cancelled  (terminal, except via rescheduled flow)
        any   → rescheduled (creates a new booked row, marks current as rescheduled)
        upcoming|in_progress → no_show

    `_resolved_status` in services/appointments.py overlays a time-based
    derivation on top of the persisted state for legacy records that only
    distinguish UPCOMING vs COMPLETED via `appointment_date`.
    """

    BOOKED = "booked"
    SCHEDULED = "scheduled"
    UPCOMING = "upcoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class ReminderTypeEnum(str, Enum):
    MEDICINE = "medicine"
    APPOINTMENT = "appointment"
    EXERCISE = "exercise"


class ReminderRepeatEnum(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class OnboardingStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


def _enum_values(enum_cls: type[Enum]) -> list[str]:
    """Persist Enum `.value` to PostgreSQL enum columns (not Enum member names)."""
    return [member.value for member in enum_cls]


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    onboarding_status: Mapped[str] = mapped_column(
        String(20),
        default=OnboardingStatusEnum.PENDING.value,
        nullable=False,
    )
    onboarding_completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    email_verified_at: Mapped[datetime.datetime | None] = mapped_column(
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

    # Account lockout fields
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    locked_until: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # MFA fields
    mfa_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    mfa_secret: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    mfa_recovery_codes: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # B7 P9 — Soft delete with grace period.
    # `deleted_at` flips during the user-initiated DELETE flow; `purge_at`
    # is set 30d in the future. The daily Celery beat hard-purges users
    # whose `purge_at <= now()` and anonymizes their audit trail.
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    purge_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    deletion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # B7 P0 (post-review) — explicit "this user has set a real password" flag.
    # Replaces the broken `_looks_like_oauth_placeholder` heuristic. Set:
    #   * True on email/password registration, password reset, password change.
    #   * False on OAuth-only provisioning (where `hashed_password` is just
    #     `bcrypt(provider_account_id)`, an unguessable placeholder).
    # Drives the account-deletion identity-check (OAuth-only users get OTP
    # instead of password) and the OAuth-link "last sign-in method" guard.
    has_password: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    # B7 P1-5 (post-review) — global per-user JWT cutoff. Any token with
    # `iat < tokens_invalidated_at` is rejected by `get_current_user`.
    # Used by deletion + force-logout flows to truly "revoke all sessions"
    # rather than only blacklisting the caller's current JWT.
    tokens_invalidated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    profile: Mapped[UserProfile | None] = relationship(
        back_populates="user",
        uselist=False,
    )
    meals: Mapped[list[Meal]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    health_metrics: Mapped[list[HealthMetric]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    connected_devices: Mapped[list[ConnectedDevice]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list[Notification]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    appointments: Mapped[list[Appointment]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    health_goal: Mapped["HealthGoal | None"] = relationship(
        "HealthGoal",
        back_populates="user",
        uselist=False,
    )
    preferences: Mapped["UserPreference | None"] = relationship(
        "UserPreference", back_populates="user", uselist=False,
    )


class EmailOtp(Base):
    __tablename__ = "email_otps"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    attempts_left: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        server_default=text("5"),
    )
    consumed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[GenderEnum | None] = mapped_column(
        SAEnum(GenderEnum, name="gender_enum", values_callable=_enum_values),
        nullable=True,
    )
    blood_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    emergency_contacts: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    medical_info: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="profile")


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[MealStatusEnum] = mapped_column(
        SAEnum(MealStatusEnum, name="meal_status_enum", values_callable=_enum_values),
        nullable=False,
    )
    nutrition_result: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    logged_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
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

    user: Mapped[User] = relationship(back_populates="meals")


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    metric_type: Mapped[MetricTypeEnum] = mapped_column(
        SAEnum(MetricTypeEnum, name="metric_type_enum", values_callable=_enum_values),
        nullable=False,
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    recorded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    source: Mapped[WearableSourceEnum] = mapped_column(
        SAEnum(WearableSourceEnum, name="wearable_source_enum", values_callable=_enum_values),
        nullable=False,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="health_metrics")


class ConnectedDevice(Base):
    __tablename__ = "connected_devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[WearableProviderEnum] = mapped_column(
        SAEnum(WearableProviderEnum, name="wearable_provider_enum", values_callable=_enum_values),
        nullable=False,
    )
    connected_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_synced_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="connected_devices")


class NotificationKindEnum(str, Enum):
    """Coarse category — drives icon, route hint, and grouping in the popover.

    Kept open-ended (`String` column under the hood) so new kinds can be added
    without an enum migration; the FE treats unknown values as `INFO`.
    """

    INFO = "info"
    REMINDER = "reminder"
    APPOINTMENT = "appointment"
    DATA_EXPORT = "data_export"
    REPORT_PDF = "report_pdf"
    ACCOUNT = "account"
    OAUTH = "oauth"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    # Coarse category. Kept as a free string so adding a new kind does not
    # require an enum migration; `NotificationKindEnum` is the authoritative list.
    kind: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default=text("'info'"),
    )
    # Optional pointer to the originating entity (reminder occurrence, export
    # request, etc.). Loose UUID — not a FK, deliberately, so we can keep
    # notifications around after the source row is purged.
    reference_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    # Deep link the FE should navigate to when the user taps the notification.
    link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    read_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="notifications")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    appointment_date: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    doctor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(128), nullable=True)
    clinic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[AppointmentStatusEnum] = mapped_column(
        SAEnum(
            AppointmentStatusEnum,
            name="appointment_status_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AppointmentStatusEnum.UPCOMING,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescription: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
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

    user: Mapped[User] = relationship(back_populates="appointments")
    prescription_assets: Mapped[list["PrescriptionAsset"]] = relationship(
        back_populates="appointment",
        cascade="all, delete-orphan",
    )


class PrescriptionAsset(Base):
    """Uploaded prescription file (PDF / PNG / JPEG) attached to an appointment.

    The bucket/key pair is the canonical pointer to the object in MinIO/S3;
    we never expose those raw — clients always go through
    `GET /v1/appointments/{id}/prescription/assets/{asset_id}/url` which mints
    a fresh 5-minute presigned URL on every click. SHA-256 enables dedupe and
    after-the-fact integrity audit.
    """

    __tablename__ = "prescription_assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # B7 review P1-6 — column is nullable (FK uses SET NULL on cascade), so
    # the mapped type must match. Otherwise mypy/Pyright flag the mismatch
    # and runtime callers see `str(asset.uploaded_by) == "None"` after a purge.
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    original_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
    uploaded_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    appointment: Mapped[Appointment] = relationship(back_populates="prescription_assets")


class ReminderOccurrenceStatusEnum(str, Enum):
    """State machine for a single occurrence of a recurring reminder.

    pending → fired → done | skipped | snoozed
    pending → missed (catch-up sweep when an occurrence wasn't fired in time)
    """

    PENDING = "pending"
    FIRED = "fired"
    DONE = "done"
    SKIPPED = "skipped"
    SNOOZED = "snoozed"
    MISSED = "missed"


class Reminder(Base):
    """Reminder schedule (the rule).

    B7: kept additive. Old `remind_time` (string "HH:MM") and `done` (bool)
    columns survive for backwards compatibility — `done` is now only used as a
    "did the user globally archive this rule" flag; per-occurrence state lives
    in `reminder_occurrences`.
    """

    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[ReminderTypeEnum] = mapped_column(
        SAEnum(
            ReminderTypeEnum,
            name="reminder_type_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Legacy "HH:MM" string. New code reads `time_of_day` first.
    remind_time: Mapped[str] = mapped_column(String(16), nullable=False)
    repeat: Mapped[ReminderRepeatEnum] = mapped_column(
        SAEnum(
            ReminderRepeatEnum,
            name="reminder_repeat_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=ReminderRepeatEnum.ONCE,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Soft-archive — separate from per-occurrence "done"; kept for back-compat.
    done: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    # ── B7 P5 schedule fields ─────────────────────────────────────────────
    tzid: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        server_default=text("'Asia/Ho_Chi_Minh'"),
    )
    time_of_day: Mapped[datetime.time | None] = mapped_column(
        Time,
        nullable=True,
    )
    # 7-bit bitmap; bit 0 = Mon, bit 6 = Sun. Used when `repeat='weekly'`.
    weekday_mask: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    # 1-31 (or -1 for "last day of month"). Used when `repeat='monthly'`.
    day_of_month: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    # Denormalized — refreshed by the materialization beat. Indexed for fast filter.
    next_occurrence_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
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

    user: Mapped[User] = relationship(back_populates="reminders")
    occurrences: Mapped[list["ReminderOccurrence"]] = relationship(
        back_populates="reminder",
        cascade="all, delete-orphan",
    )


class ReminderOccurrence(Base):
    """Materialized firing event for a Reminder schedule.

    One row per (reminder_id, scheduled_at). `notification_id` (loose UUID,
    not a FK so the row survives notification purges) lets the FE jump from
    a notification straight to its source occurrence.
    """

    __tablename__ = "reminder_occurrences"
    __table_args__ = (
        UniqueConstraint("reminder_id", "scheduled_at", name="uq_reminder_occurrence_slot"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    reminder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reminders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'pending'"),
    )
    done_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    skipped_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    snoozed_until: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fired_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    reminder: Mapped[Reminder] = relationship(back_populates="occurrences")


# ─────────────────────────────────────────────────────────────────────────────
# CHAT MODELS
# ─────────────────────────────────────────────────────────────────────────────

class ConversationTypeEnum(str, Enum):
    DIRECT = "direct"
    GROUP = "group"
    AI = "ai"


class MessageContentTypeEnum(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    AUDIO = "audio"
    SYSTEM = "system"


class MessageStatusEnum(str, Enum):
    """B7 P6 — message lifecycle, used primarily for AI streaming.

    Non-AI direct/group messages get persisted as `completed` immediately.
    """

    PENDING = "pending"
    STREAMING = "streaming"
    COMPLETED = "completed"
    STOPPED = "stopped"
    FAILED = "failed"


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    type: Mapped[ConversationTypeEnum] = mapped_column(
        SAEnum(ConversationTypeEnum, name="conversation_type_enum", values_callable=_enum_values),
        nullable=False,
        default=ConversationTypeEnum.DIRECT,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
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

    members: Mapped[list[ConversationMember]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list[Message]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    pinned_messages: Mapped[list[PinnedMessage]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Role: "owner", "admin", "member"
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="member")
    # For stranger/pending requests: receiver has is_accepted=False until they accept
    is_accepted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    is_muted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    is_pinned: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    theme_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_read_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conv_member"),
    )

    conversation: Mapped[Conversation] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Client-supplied idempotency key to prevent duplicate sends on retry
    client_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_type: Mapped[MessageContentTypeEnum] = mapped_column(
        SAEnum(
            MessageContentTypeEnum,
            name="message_content_type_enum",
            values_callable=_enum_values,
        ),
        nullable=False,
        default=MessageContentTypeEnum.TEXT,
    )
    # Attachments: [{url, name, size, mime_type}]
    attachments: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    # Reply-to: stores the replied message id
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_recalled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    # B7 P6 — lifecycle for AI streaming. Non-streaming sends are `completed`.
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'completed'"),
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    edited_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    sender: Mapped[User | None] = relationship()
    reply_to: Mapped[Message | None] = relationship(remote_side="Message.id", foreign_keys=[reply_to_id])
    reactions: Mapped[list[MessageReaction]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
    )
    receipts: Mapped[list[MessageReceipt]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
    )


class MessageReceipt(Base):
    """Tracks delivery and read status per user per message."""

    __tablename__ = "message_receipts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    delivered_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    read_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_receipt"),
    )

    message: Mapped[Message] = relationship(back_populates="receipts")
    user: Mapped[User] = relationship()


class MessageReaction(Base):
    """Emoji reactions on a message. One emoji per user per message."""

    __tablename__ = "message_reactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    emoji: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_message_reaction"),
    )

    message: Mapped[Message] = relationship(back_populates="reactions")
    user: Mapped[User] = relationship()


class PinnedMessage(Base):
    """Tracks which messages are pinned in a conversation."""

    __tablename__ = "pinned_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
    )
    pinned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    pinned_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("conversation_id", "message_id", name="uq_pinned_message"),
    )

    conversation: Mapped[Conversation] = relationship(back_populates="pinned_messages")
    message: Mapped[Message] = relationship()
    pinner: Mapped[User] = relationship(foreign_keys=[pinned_by])


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    theme_mode: Mapped[str] = mapped_column(String(10), default="system", nullable=False)
    accent_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    appearance: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False,
    )
    user: Mapped["User"] = relationship(back_populates="preferences")


# ─────────────────────────────────────────────────────────────────────────────
# B7 P3 — OAuth linked accounts
# ─────────────────────────────────────────────────────────────────────────────


class OAuthProviderEnum(str, Enum):
    GOOGLE = "google"
    GITHUB = "github"


class OAuthAccount(Base):
    """One row per (user, OAuth provider account) pair.

    A user can have multiple linked providers (Google + GitHub on the same
    account). Sign-in via a provider looks up the (provider, provider_account_id)
    pair first; falls back to email match for legacy users; otherwise creates
    a new user.

    Uniqueness on (provider, provider_account_id) ensures one provider account
    can only be linked to a single internal user — the conflict-on-link
    surface returns 409 with `OAUTH_ACCOUNT_ALREADY_LINKED`.
    """

    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )

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
    provider: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    provider_account_id: Mapped[str] = mapped_column(String(255), nullable=False)
    # Snapshot of the email/name/avatar at link time (provider may change later).
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    linked_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(foreign_keys=[user_id])


# ─────────────────────────────────────────────────────────────────────────────
# B7 P2 — Ingredient catalog (replaces the FE-only static dataset)
# ─────────────────────────────────────────────────────────────────────────────


class IngredientCategoryEnum(str, Enum):
    GRAIN = "grain"
    MEAT = "meat"
    SEAFOOD = "seafood"
    VEGETABLE = "vegetable"
    FRUIT = "fruit"
    DAIRY = "dairy"
    OIL_SAUCE = "oil_sauce"
    OTHER = "other"


class DataExportStatusEnum(str, Enum):
    """B7 P8 — lifecycle of a user data-export job."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class DataExportRequest(Base):
    """One row per user data export request.

    The blob lives in MinIO at `bucket/key`. We keep `expires_at` so the
    daily janitor can purge stale objects, and we record SHA256 to detect
    truncation/corruption when the user finally downloads.
    """

    __tablename__ = "data_export_requests"

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
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'pending'"),
    )
    requested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class ReportExportRequest(Base):
    """B7 P10 — one row per PDF report export job.

    Distinct from `data_export_requests` because the parameters and ownership
    semantics differ: a report export is a *snapshot* of a chosen window
    (period + sections + locale), can be regenerated at any time, and is
    not subject to the GDPR 1-per-24h rate limit.
    """

    __tablename__ = "report_export_requests"

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
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'pending'"),
    )
    period: Mapped[str] = mapped_column(String(8), nullable=False)
    sections: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    locale: Mapped[str] = mapped_column(String(8), nullable=False, server_default=text("'en'"))
    include_sensitive: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    requested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    bucket: Mapped[str | None] = mapped_column(String(255), nullable=True)
    key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class Ingredient(Base):
    """Bilingual ingredient lookup table.

    Backfilled from `frontend/src/data/ingredients.ts` so the meal flow has a
    real reference set on day one. `slug` is unique and stable for analytics
    even if names are localized later.
    """

    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name_vi: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default=text("'other'"),
    )
    calories_per_100g: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    protein_per_100g: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    carbs_per_100g: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    fat_per_100g: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    unit_hint: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'gram'"))
    # Provenance — `seed` for backfill rows; `manual` for admin-added; `external`
    # for future API imports. Lets us filter low-quality rows later.
    source: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'seed'"))
    # English-name verification flag (true once a human reviewer signs off, or
    # the row came from a curated source). Defaults true for backfill rows so
    # we don't gate the existing FE list; future LLM-translated rows start false.
    name_en_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
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

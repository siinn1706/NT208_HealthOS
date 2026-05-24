from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Index, Integer, String, Text, Time, UniqueConstraint, func, text
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
    # Legacy core metrics — present since the original schema, surfaced
    # directly on the dashboard KPI cards.
    HEART_RATE = "heart_rate"
    STEPS = "steps"
    SLEEP_MINUTES = "sleep_minutes"
    WEIGHT_KG = "weight_kg"
    BLOOD_PRESSURE_SYSTOLIC = "blood_pressure_systolic"
    BLOOD_PRESSURE_DIASTOLIC = "blood_pressure_diastolic"
    # Wearable sync expansion (migration 030). Each value maps 1:1 to a
    # Health Connect record type or Google Health API data type — see
    # ``app/services/wearable_sync/normalizer.py`` for the canonical mapping.
    # Cardiovascular
    HEART_RATE_RESTING = "heart_rate_resting"
    HEART_RATE_MAX = "heart_rate_max"
    HRV_RMSSD = "hrv_rmssd"
    # Respiratory
    SPO2 = "spo2"
    RESPIRATORY_RATE = "respiratory_rate"
    VO2_MAX = "vo2_max"
    # Activity
    DISTANCE_M = "distance_m"
    CALORIES_ACTIVE = "calories_active"
    CALORIES_TOTAL = "calories_total"
    FLOORS_CLIMBED = "floors_climbed"
    ACTIVE_MINUTES = "active_minutes"
    EXERCISE_SESSION_MINUTES = "exercise_session_minutes"
    # Sleep stages (sleep_minutes above is the legacy total — these are
    # the per-stage breakdown).
    SLEEP_LIGHT = "sleep_light"
    SLEEP_DEEP = "sleep_deep"
    SLEEP_REM = "sleep_rem"
    SLEEP_AWAKE = "sleep_awake"
    SLEEP_EFFICIENCY = "sleep_efficiency"
    # Body composition
    BODY_FAT_PERCENTAGE = "body_fat_percentage"
    LEAN_BODY_MASS = "lean_body_mass"
    BONE_MASS = "bone_mass"
    BODY_WATER = "body_water"
    BMI = "bmi"
    HEIGHT_CM = "height_cm"
    # Temperature
    BODY_TEMPERATURE = "body_temperature"
    SKIN_TEMPERATURE_DELTA = "skin_temperature_delta"
    # Misc
    BLOOD_GLUCOSE = "blood_glucose"
    HYDRATION_ML = "hydration_ml"
    STRESS_SCORE = "stress_score"
    MENSTRUAL_FLOW = "menstrual_flow"
    MINDFULNESS_MINUTES = "mindfulness_minutes"


class WearableSourceEnum(str, Enum):
    MANUAL = "manual"
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT = "google_fit"
    GARMIN = "garmin"
    FITBIT = "fitbit"
    # Android Health Connect — distinct from `google_fit` (which is being
    # deprecated). HC is a multi-source aggregator on the device; the
    # `source_app` column on health_metrics records which app inside HC
    # produced each row (Samsung Health, Pixel, Strava, etc.).
    HEALTH_CONNECT = "health_connect"
    # Server-side Google Health API (Luồng B). Tokens stored encrypted on
    # the connected_devices row; Celery Beat polls every N minutes and
    # ingests via the normalizer + existing health_sync.upsert_batch path.
    GOOGLE_HEALTH = "google_health"


class WearableProviderEnum(str, Enum):
    APPLE_HEALTH = "apple_health"
    GOOGLE_FIT = "google_fit"
    GARMIN = "garmin"
    FITBIT = "fitbit"
    HEALTH_CONNECT = "health_connect"
    # See WearableSourceEnum.GOOGLE_HEALTH above for context.
    GOOGLE_HEALTH = "google_health"


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


class MedicationPlanStatusEnum(str, Enum):
    """Lifecycle of a user's medication plan.

    active     → user is actively taking the medication; child reminders fire.
    paused     → user temporarily stopped (side effects, doctor instruction);
                 child reminders are deactivated and pending occurrences
                 are bulk-cancelled. Resumable.
    completed  → course finished naturally (e.g., 5-day antibiotic).
    cancelled  → user archived the plan; kept for adherence history.
    """

    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MedicationFormEnum(str, Enum):
    TABLET = "tablet"
    CAPSULE = "capsule"
    LIQUID = "liquid"
    INJECTION = "injection"
    DROPS = "drops"
    OTHER = "other"


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

    # AI Chat: marks the system-owned bot user (`ai-bot@healthos.local`).
    # Filtered out of normal user listings, lookups, and auth flows so the
    # bot can never be targeted by a real login attempt.
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
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
    refresh_token_sessions: Mapped[list["RefreshTokenSession"]] = relationship(
        "RefreshTokenSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class RefreshTokenSession(Base):
    __tablename__ = "refresh_token_sessions"

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
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    revoked_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("refresh_token_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="refresh_token_sessions")
    replaced_by: Mapped["RefreshTokenSession | None"] = relationship(
        "RefreshTokenSession",
        remote_side="RefreshTokenSession.id",
        foreign_keys=[replaced_by_id],
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
    # Migration 024 — partial unique index `uq_health_metrics_external_id`
    # on (user_id, source, external_id) WHERE external_id IS NOT NULL is
    # the dedupe key. Manual rows (external_id=NULL) are exempt.

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
    # Health Connect identity tuple. `external_id` is the HC record's
    # `clientRecordId` (when HealthOS owns the row) or `metadata.id` (when
    # HealthOS just observes it). `external_version` mirrors HC's
    # `clientRecordVersion` / `lastModifiedTime` epoch ms — the upsert
    # only overwrites when the incoming version is strictly higher.
    external_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    external_version: Mapped[int | None] = mapped_column(nullable=True)
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("connected_devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Source app's Android package name (e.g. com.sec.android.app.shealth).
    # Renders as a "Synced from Samsung Health" pill in the UI.
    source_app: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # HC `Metadata.recordingMethod` — automatic / manual / active / unknown.
    recording_method: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # Tombstone fields — HC can report deletions via getChanges; we keep the
    # row for audit and so UI can render "removed at the source" states.
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="health_metrics")
    device: Mapped["ConnectedDevice | None"] = relationship(
        "ConnectedDevice",
        foreign_keys=[device_id],
    )


class ConnectedDevice(Base):
    __tablename__ = "connected_devices"
    # Migration 024 — uniqueness on (user_id, provider, external_account_id)
    # gives us "one row per (user, provider, source app)". external_account_id
    # is nullable so legacy stub providers (Apple Health / Garmin / Fitbit)
    # still satisfy the constraint via NULL distinctness.
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            "external_account_id",
            name="uq_connected_devices_user_provider_account",
        ),
        Index(
            "uq_connected_devices_google_account_global",
            "provider",
            "external_account_id",
            unique=True,
            postgresql_where=text(
                "provider = 'google_health' AND external_account_id IS NOT NULL"
            ),
        ),
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
    )
    provider: Mapped[WearableProviderEnum] = mapped_column(
        SAEnum(WearableProviderEnum, name="wearable_provider_enum", values_callable=_enum_values),
        nullable=False,
    )
    # For Health Connect: the source-app package name (Pixel app, Samsung
    # Health, etc.). NULL for legacy stub providers that did not capture it.
    external_account_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    device_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # JSON list of HC record types the user granted permission for, e.g.
    # ["Steps","HeartRate","SleepSession","Weight"]. Used by the sync
    # orchestrator to know what to ask for and by the UI to render the
    # "X of N permissions granted" banner.
    scopes: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    # Most recent sync result — surfaces directly in the UI without needing
    # to crack open the audit log. Status is one of
    # ok | partial | permission_denied | error. Error string is a short
    # human-readable code, never PHI or raw exception detail.
    last_sync_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_sync_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_attempted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    # ── Server-side OAuth (Luồng B — Google Health API). Migration 030. ──
    # All nullable so health_connect rows (Luồng A, tokens live on the
    # device) and legacy stub rows are unaffected. The application layer
    # encrypts/decrypts via ``services/wearable_sync/token_crypto.py``;
    # the DB just holds Fernet ciphertext.
    access_token_encrypted: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    refresh_token_encrypted: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    token_expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    # Distinct from `scopes` above — that one holds Health Connect record-type
    # names (["Steps","HeartRate",...]); `oauth_scopes` holds Google Health
    # scope URIs (["https://www.googleapis.com/auth/fitness.activity.read",
    # ...]). Used by the sync task to skip data types the user didn't grant.
    oauth_scopes: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    # Populated only if Google Health supports push notifications for the
    # connected account; null when we fall back to Celery Beat polling.
    webhook_subscription_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    user: Mapped[User] = relationship(back_populates="connected_devices")
    sync_states: Mapped[list["DeviceSyncState"]] = relationship(
        "DeviceSyncState",
        back_populates="device",
        cascade="all, delete-orphan",
    )


class DeviceSyncState(Base):
    """Per-(device, record_type) Health Connect sync cursor.

    The `changes_token` is opaque to HealthOS — Android's HC SDK issues it
    and we just round-trip it. Storing it server-side (rather than on the
    device) means a reinstall doesn't lose history and two devices on one
    user can share one logical sync state per record type.

    `consecutive_failures` powers the "you might need to reconnect"
    banner — after 5 in a row we mark the device's `last_sync_status`
    as `error` and surface a CTA in the settings UI.
    """

    __tablename__ = "device_sync_state"
    __table_args__ = (
        UniqueConstraint(
            "device_id",
            "record_type",
            name="uq_device_sync_state_device_record",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("connected_devices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    record_type: Mapped[str] = mapped_column(String(64), nullable=False)
    changes_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_attempted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    consecutive_failures: Mapped[int] = mapped_column(
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

    device: Mapped[ConnectedDevice] = relationship(back_populates="sync_states")


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
    pending|snoozed → cancelled (medication paused / archived; review M5 — kept
        separate from `skipped` so adherence math doesn't penalize the user
        for *system*-cancelled doses they never opted to skip).

    The DB column is `String(16)` with no CHECK, so adding a new enum member
    is migration-free — existing reminder logic that only knew the original
    six states continues to work; readers that don't recognize `cancelled`
    fall through their pattern matches harmlessly.
    """

    PENDING = "pending"
    FIRED = "fired"
    DONE = "done"
    SKIPPED = "skipped"
    SNOOZED = "snoozed"
    MISSED = "missed"
    CANCELLED = "cancelled"


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
    # Medication Hub — nullable FK linking this reminder to a `MedicationPlan`.
    # Reminders that pre-date the hub (or that the user creates ad-hoc on the
    # reminders page) keep `medication_plan_id IS NULL` and behave exactly as
    # before. Plan-owned reminders are always `type='medicine'` (enforced in
    # the medication service, not at the DB level — keeps the FK strictly
    # additive).
    medication_plan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medication_plans.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
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
    medication_plan: Mapped["MedicationPlan | None"] = relationship(
        back_populates="reminders",
        foreign_keys=[medication_plan_id],
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
# MEDICATION HUB
# ─────────────────────────────────────────────────────────────────────────────


class MedicationPlan(Base):
    """A drug a user is currently (or was previously) taking.

    Owns one or more child `Reminder` rows — one per dose-time-of-day. Multi-dose
    schedules are represented as N child reminders sharing the same plan_id and
    `type='medicine'`. The recurrence engine, occurrence materializer, fire-due
    Celery beat, and notification pipeline are all reused from the existing
    reminders subsystem; this table only adds drug metadata + refill state +
    appointment provenance + lifecycle status.

    Adherence is computed by joining `reminder_occurrences` to plan-owning
    reminders — no separate adherence storage.

    Provenance: when imported from `appointment.prescription`, `appointment_id`
    is set and `dedupe_key` carries `sha256("{appointment_id}:{idx}:{name}")`
    so that re-imports are idempotent.
    """

    __tablename__ = "medication_plans"

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
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    generic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(64), nullable=True)
    form: Mapped[str | None] = mapped_column(String(32), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescriber: Mapped[str | None] = mapped_column(String(255), nullable=True)
    clinic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        server_default=text("'active'"),
    )
    tzid: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        server_default=text("'Asia/Ho_Chi_Minh'"),
    )
    refill_supply_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refill_cadence_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_refill_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    next_refill_estimated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    # Refill-alert crossing-detection (review H6). Stores the lowest threshold
    # we've already notified the user about *for the current supply cycle*.
    # Reset to NULL on `log_refill`. The daily beat fires whenever
    # `days_remaining <= ALERT_THRESHOLDS[i]` AND
    # `(last_refill_alert_threshold IS NULL OR last_refill_alert_threshold > ALERT_THRESHOLDS[i])`,
    # so a supply that drops 8→5 still triggers the 7-day alert.
    last_refill_alert_threshold: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    review_due_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    dedupe_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_medication_plan_dedupe"),
    )

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    appointment: Mapped["Appointment | None"] = relationship(foreign_keys=[appointment_id])
    reminders: Mapped[list["Reminder"]] = relationship(
        back_populates="medication_plan",
        cascade="all, delete-orphan",
        foreign_keys="Reminder.medication_plan_id",
    )


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
    # AI metadata for messages produced by the AI bot:
    #   {model, prompt_tokens, completion_tokens, total_tokens, latency_ms,
    #    finish_reason, is_first}
    # NULL for human messages.
    ai_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
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
    locale: Mapped[str] = mapped_column(String(2), default="en", nullable=False)
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

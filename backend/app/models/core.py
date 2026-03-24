from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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
    COMPLETED = "completed"
    UPCOMING = "upcoming"
    CANCELLED = "cancelled"


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
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
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


class Reminder(Base):
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
    done: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
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

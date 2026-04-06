"""Audit log models for security event tracking."""
from __future__ import annotations

import datetime
import uuid
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.core import Base, _enum_values


class AuditEventTypeEnum(str, Enum):
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    # Password events
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    PASSWORD_CHANGED = "password_changed"
    # MFA events
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_VERIFIED = "mfa_verified"
    MFA_FAILED = "mfa_failed"
    MFA_RECOVERY_REGENERATED = "mfa_recovery_regenerated"
    # Account events
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DELETED = "account_deleted"
    # OAuth events
    OAUTH_LOGIN_SUCCESS = "oauth_login_success"
    OAUTH_LOGIN_FAILED = "oauth_login_failed"
    # Breach events
    PASSWORD_BREACHED = "password_breached"


class AuditLog(Base):
    """Security audit log for tracking authentication and security-related events."""

    __tablename__ = "security_audit_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "event_type", "created_at", name="uq_audit_event_sequence"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[AuditEventTypeEnum] = mapped_column(
        SAEnum(AuditEventTypeEnum, name="audit_event_type_enum", values_callable=_enum_values),
        nullable=False,
        index=True,
    )
    # IP address of the client
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True, index=True)
    # User-Agent string
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Additional event details (failure reason, lockout duration, etc.)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(foreign_keys=[user_id])

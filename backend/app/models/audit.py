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
    # B7 — Linked OAuth accounts (settings → linked accounts)
    OAUTH_LINK_ADDED = "oauth_link_added"
    OAUTH_LINK_REMOVED = "oauth_link_removed"
    OAUTH_LINK_REJECTED_CONFLICT = "oauth_link_rejected_conflict"
    # B7 — Prescription assets (signed-URL pipeline)
    PRESCRIPTION_ASSET_UPLOADED = "prescription_asset_uploaded"
    PRESCRIPTION_ASSET_DOWNLOADED = "prescription_asset_downloaded"
    PRESCRIPTION_ASSET_DELETED = "prescription_asset_deleted"
    # B7 — Data export (GDPR-style data download)
    DATA_EXPORT_REQUESTED = "data_export_requested"
    DATA_EXPORT_DOWNLOADED = "data_export_downloaded"
    # B7 — Account deletion lifecycle
    ACCOUNT_DELETION_REQUESTED = "account_deletion_requested"
    ACCOUNT_DELETION_CANCELLED = "account_deletion_cancelled"
    ACCOUNT_PURGED = "account_purged"
    # B7 — PDF report export
    REPORT_PDF_REQUESTED = "report_pdf_requested"
    REPORT_PDF_DOWNLOADED = "report_pdf_downloaded"
    # Breach events
    PASSWORD_BREACHED = "password_breached"
    # Health Connect sync — see migration 024 for the matching enum entries.
    # `details` payload limited to {device_id, scopes, count, error_code} —
    # never raw values.
    HEALTH_DATA_SYNC_STARTED = "health_data_sync_started"
    HEALTH_DATA_SYNC_COMPLETED = "health_data_sync_completed"
    HEALTH_DATA_SYNC_FAILED = "health_data_sync_failed"
    HEALTH_CONNECT_PERMISSION_GRANTED = "health_connect_permission_granted"
    HEALTH_CONNECT_PERMISSION_REVOKED = "health_connect_permission_revoked"
    HEALTH_CONNECT_DISCONNECTED = "health_connect_disconnected"
    # Medication Hub — plan lifecycle + refill + appointment import + summary export.
    MEDICATION_PLAN_CREATED = "medication_plan_created"
    MEDICATION_PLAN_UPDATED = "medication_plan_updated"
    MEDICATION_PLAN_PAUSED = "medication_plan_paused"
    MEDICATION_PLAN_RESUMED = "medication_plan_resumed"
    MEDICATION_PLAN_DELETED = "medication_plan_deleted"
    MEDICATION_REFILL_LOGGED = "medication_refill_logged"
    MEDICATION_IMPORTED_FROM_APPOINTMENT = "medication_imported_from_appointment"
    MEDICATION_SUMMARY_EXPORTED = "medication_summary_exported"
    # Emergency Health Card — token lifecycle + first-from-IP public reads.
    EMERGENCY_TOKEN_CREATED = "emergency_token_created"
    EMERGENCY_TOKEN_REVOKED = "emergency_token_revoked"
    EMERGENCY_PUBLIC_ACCESS_FIRST = "emergency_public_access_first"
    EMERGENCY_PROFILE_UPDATED = "emergency_profile_updated"
    # Cross-user IDOR denial — logged when an authenticated user attempts to
    # access a resource they do not own. Filtered from user-facing log list.
    SECURITY_ACCESS_DENIED = "security_access_denied"


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

"""Emergency Health Card models.

Three additive tables (migration 026_emergency_profile_share):

  * `emergency_profiles`     — per-user opt-in row with overrides + master switch
  * `emergency_share_tokens` — many-per-user revocable QR tokens (hash-only)
  * `emergency_access_logs`  — append-only public-hit audit trail

Kept in a separate module from `core.py` because `core.py` already exceeds the
modularization threshold from `CLAUDE.md` and these tables compose a single,
self-contained domain (mirroring the visit_briefs.py split).

Status / assistance / visibility-flags columns are persisted as `String` /
`JSONB` (with server-side defaults) instead of native PG enums for the same
reason as `Notification.kind`: lets us add an assistance category in code
without a follow-up enum migration. The Python `Enum` classes below are the
authoritative list.
"""
from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.core import Base

if TYPE_CHECKING:
    from app.models.core import User  # noqa: F401


# ─────────────────────────────────────────────────────────────────────────────
# Authoritative enums (mirrored as Pydantic Literals in app.schemas.emergency)
# ─────────────────────────────────────────────────────────────────────────────


class AssistanceNeedEnum(str, Enum):
    """Coarse assistance categories drawn from the CT.gov / Mayo Clinic ICE
    card guidance. Deliberately small; free-text refinement lives in
    `equipment_notes` / `communication_notes`.
    """

    WALKING = "walking"
    COMMUNICATION = "communication"
    DIETARY = "dietary"
    HEARING = "hearing"
    VISION = "vision"
    COGNITIVE = "cognitive"


class EmergencyCardFieldEnum(str, Enum):
    """Stable field keys used by `field_visibility` JSON map.

    Missing key in `field_visibility` = visible. Explicit `false` = hidden.
    Adding a new field key here is forward-compatible (existing rows treat
    unknown keys as `true`).
    """

    BLOOD_TYPE = "blood_type"
    AGE = "age"
    GENDER = "gender"
    ALLERGIES = "allergies"
    CONDITIONS = "conditions"
    MEDICATIONS = "medications"
    CONTACTS = "contacts"
    ASSISTANCE = "assistance"
    EQUIPMENT = "equipment"
    COMMUNICATION = "communication"
    PREFERRED_LANGUAGE = "preferred_language"


# ─────────────────────────────────────────────────────────────────────────────
# Tables
# ─────────────────────────────────────────────────────────────────────────────


class EmergencyProfile(Base):
    """Owner-side configuration for the emergency card.

    Existence of a row does NOT mean the card is published — `is_published`
    is the master kill switch and is independent of revoking individual
    tokens. The card is only visible publicly when `is_published=true` AND
    at least one un-revoked token exists.

    Source data (name, blood type, allergies, conditions, contacts, meds) is
    derived from `users` / `user_profiles` / `medication_plans` at read time —
    we never duplicate PHI here. This row only stores overrides + visibility
    metadata.
    """

    __tablename__ = "emergency_profiles"

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
    is_published: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    # JSONB list of `AssistanceNeedEnum.value` strings.
    assistance_needed: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    equipment_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    communication_notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    field_visibility: Mapped[dict[str, bool]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    # Clinical NKDA — when true, the card explicitly displays
    # "No known drug allergies" instead of an empty allergies block.
    nkda_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    preferred_language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    last_published_at: Mapped[datetime.datetime | None] = mapped_column(
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

    user: Mapped["User"] = relationship(foreign_keys=[user_id])


class EmergencyShareToken(Base):
    """Revocable QR-encoded share token (one row per laminated/printed card).

    Storage is hash-only — the plaintext token (≈43 chars from
    `secrets.token_urlsafe(32)`) is returned to the owner exactly once at
    mint time and never persisted. Lookup on the public route is by SHA-256
    of the inbound token, identical to the OTP / session pattern in this
    repo.
    """

    __tablename__ = "emergency_share_tokens"

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
    label: Mapped[str] = mapped_column(String(64), nullable=False)
    # SHA-256 hex of the URL-safe plaintext token. UNIQUE so brute-force
    # collision attempts surface as integrity errors, not duplicate rows.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    revoked_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_accessed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    access_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    # F4 — no `delete-orphan` cascade. Access logs SHOULD survive when a
    # token row is hard-deleted (their `token_id` is then SET NULL by the
    # DB FK). The relationship is read-only-ish from the token side; we
    # only use it for reverse-navigation in tests and admin tooling.
    access_logs: Mapped[list["EmergencyAccessLog"]] = relationship(
        back_populates="token",
    )

    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_emergency_share_token_hash"),
        Index(
            "ix_emergency_share_tokens_user_active",
            "user_id",
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )


class EmergencyAccessLog(Base):
    """Append-only audit row for every public hit on `/v1/public/emergency/{token}`.

    F4 (review fix, migration 027) — both FKs use `ON DELETE SET NULL` so
    rows survive both token revocation/deletion AND user purge. The
    `(user_id, accessed_at)` index continues to back the owner audit view;
    purged rows simply have `user_id IS NULL` and become unjoinable.

    `ip_truncated` is `/24` (IPv4) or `/64` (IPv6) — full IPs are never
    persisted. The truncation happens at write time in the service layer.
    """

    __tablename__ = "emergency_access_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # token_id is nullable post-migration 027 so the SET NULL cascade can
    # take effect when the originating token is hard-deleted.
    token_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("emergency_share_tokens.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    ip_truncated: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    accessed_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    fields_returned: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    token: Mapped[EmergencyShareToken] = relationship(back_populates="access_logs")

    __table_args__ = (
        Index(
            "ix_emergency_access_logs_user_accessed",
            "user_id",
            "accessed_at",
        ),
    )

"""Emergency Health Card + QR Emergency Profile.

Revision ID: 026_emergency_profile_share
Revises: 025_medication_plans
Create Date: 2026-04-19

Three additive tables and four audit-event enum values to power the
Apple-Medical-ID-style minimal public emergency card + revocable QR sharing.

Tables:
  * emergency_profiles      — per-user opt-in overrides + master kill switch
  * emergency_share_tokens  — many-per-user revocable tokens (hash-only)
  * emergency_access_logs   — append-only public-hit audit trail

Audit enum gains:
  * emergency_token_created
  * emergency_token_revoked
  * emergency_public_access_first   (only first hit per (token, ip/24, 24h))
  * emergency_profile_updated

Same forward-only enum convention as migration 015 / 016 / 024 — downgrade
drops the new tables but cannot remove the enum values on Postgres < 15.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "026_emergency_profile_share"
down_revision: Union[str, None] = "025_medication_plans"
branch_labels = None
depends_on = None


NEW_AUDIT_EVENTS = (
    "emergency_token_created",
    "emergency_token_revoked",
    "emergency_public_access_first",
    "emergency_profile_updated",
)


def upgrade() -> None:
    # 1. Extend audit_event_type_enum (autocommit_block — Postgres < 15 forbids
    #    `ALTER TYPE … ADD VALUE` inside a transaction).
    with op.get_context().autocommit_block():
        for value in NEW_AUDIT_EVENTS:
            op.execute(
                f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{value}'"
            )

    # 2. emergency_profiles — one row per user (UNIQUE on user_id).
    op.create_table(
        "emergency_profiles",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_published",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        # JSONB list of enum strings: walking | communication | dietary | hearing | vision | cognitive
        sa.Column("assistance_needed", JSONB, nullable=True),
        sa.Column("equipment_notes", sa.String(500), nullable=True),
        sa.Column("communication_notes", sa.String(500), nullable=True),
        # Per-field opt-out map. Missing key = visible.
        sa.Column(
            "field_visibility",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        # Explicit "I confirm: no known drug allergies" — clinical NKDA convention.
        sa.Column(
            "nkda_confirmed",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        # ISO 639-1; falls back to user_preferences then Accept-Language.
        sa.Column("preferred_language", sa.String(8), nullable=True),
        sa.Column("last_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_emergency_profile_user"),
    )

    # 3. emergency_share_tokens — many-per-user, hash-only storage.
    op.create_table(
        "emergency_share_tokens",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.String(64), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "access_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_emergency_share_token_hash"),
    )
    op.create_index(
        "ix_emergency_share_tokens_token_hash",
        "emergency_share_tokens",
        ["token_hash"],
    )
    op.create_index(
        "ix_emergency_share_tokens_user_id",
        "emergency_share_tokens",
        ["user_id"],
    )
    # Partial index for "list active tokens" queries (the dashboard pulls this
    # constantly — narrowing to the live set keeps the scan cheap once a user
    # has accumulated revoked tokens over time).
    op.create_index(
        "ix_emergency_share_tokens_user_active",
        "emergency_share_tokens",
        ["user_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    # 4. emergency_access_logs — append-only audit. user_id is denormalized so
    #    rows survive token deletion during user purge (matches the
    #    notifications.reference_id design noted in core.py).
    op.create_table(
        "emergency_access_logs",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("token_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        # IPv4 → /24 (e.g. "192.0.2.0/24"); IPv6 → /64. 45 chars covers both.
        sa.Column("ip_truncated", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column(
            "accessed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # {"name": true, "blood_type": true, ...} — small map used for schema
        # drift detection ("did my new card render the equipment row?").
        sa.Column("fields_returned", JSONB, nullable=True),
        sa.ForeignKeyConstraint(
            ["token_id"], ["emergency_share_tokens.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_emergency_access_logs_token_id",
        "emergency_access_logs",
        ["token_id"],
    )
    # The owner audit view sorts by accessed_at DESC and filters by user_id.
    op.create_index(
        "ix_emergency_access_logs_user_accessed",
        "emergency_access_logs",
        ["user_id", "accessed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_emergency_access_logs_user_accessed", table_name="emergency_access_logs"
    )
    op.drop_index(
        "ix_emergency_access_logs_token_id", table_name="emergency_access_logs"
    )
    op.drop_table("emergency_access_logs")

    op.drop_index(
        "ix_emergency_share_tokens_user_active",
        table_name="emergency_share_tokens",
    )
    op.drop_index(
        "ix_emergency_share_tokens_user_id", table_name="emergency_share_tokens"
    )
    op.drop_index(
        "ix_emergency_share_tokens_token_hash", table_name="emergency_share_tokens"
    )
    op.drop_table("emergency_share_tokens")

    op.drop_table("emergency_profiles")
    # NOTE: enum value removal is forward-only (matches migration 015 / 024).

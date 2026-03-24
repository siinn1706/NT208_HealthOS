"""Add security audit log table.

Revision ID: 009_add_security_audit_log
Revises: 008_add_mfa
Create Date: 2026-03-24
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers
revision = "009_add_security_audit_log"
down_revision = "008_add_mfa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type (idempotent — check before create)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type_enum') THEN
                CREATE TYPE audit_event_type_enum AS ENUM (
                    'login_success','login_failed','logout','account_locked','account_unlocked',
                    'password_reset_requested','password_reset_completed','password_changed',
                    'mfa_enabled','mfa_disabled','mfa_verified','mfa_failed',
                    'account_created','account_deleted','oauth_login_success','oauth_login_failed',
                    'password_breached'
                );
            END IF;
        END $$;
        """
    )

    # Enum type already created above via DO block.
    # Use sa.Text to avoid double-creation; model uses Python Enum for validation.
    op.create_table(
        "security_audit_logs",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("details", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )

    op.create_index("ix_security_audit_logs_user_id", "security_audit_logs", ["user_id"])
    op.create_index("ix_security_audit_logs_event_type", "security_audit_logs", ["event_type"])
    op.create_index("ix_security_audit_logs_created_at", "security_audit_logs", ["created_at"])
    op.create_unique_constraint(
        "uq_audit_event_sequence", "security_audit_logs",
        ["user_id", "event_type", "created_at"]
    )


def downgrade() -> None:
    op.drop_table("security_audit_logs")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type_enum') THEN
                DROP TYPE audit_event_type_enum;
            END IF;
        END $$;
        """
    )

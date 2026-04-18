"""Add MFA fields to users table.

Revision ID: 008_add_mfa
Revises: 007_add_account_lockout
Create Date: 2026-03-24
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers
revision = "008_add_mfa"
down_revision = "007_add_account_lockout"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add mfa_enabled column
    op.add_column(
        "users",
        sa.Column(
            "mfa_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # Add mfa_secret column
    op.add_column(
        "users",
        sa.Column(
            "mfa_secret",
            sa.String(255),
            nullable=True,
        ),
    )

    # Add mfa_recovery_codes column
    op.add_column(
        "users",
        sa.Column(
            "mfa_recovery_codes",
            JSONB,
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "mfa_recovery_codes")
    op.drop_column("users", "mfa_secret")
    op.drop_column("users", "mfa_enabled")

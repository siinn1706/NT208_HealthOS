"""Add account lockout fields to users table.

Revision ID: 007_add_account_lockout
Revises: 006
Create Date: 2026-03-24
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "007_add_account_lockout"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add failed_login_attempts column
    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Add locked_until column
    op.add_column(
        "users",
        sa.Column(
            "locked_until",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_attempts")

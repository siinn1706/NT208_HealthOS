"""Add deleted_at to conversations for soft-delete on last-member-leave.

Revision ID: 039_conversation_deleted_at
Revises: 038_subscription_plans
Create Date: 2026-05-26
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "039_conversation_deleted_at"
down_revision = "038_subscription_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversations", "deleted_at")

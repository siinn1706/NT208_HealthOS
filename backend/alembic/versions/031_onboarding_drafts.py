"""Add onboarding_drafts table.

Revision ID: 031_onboarding_drafts
Revises: 030_add_refresh_token_sessions
Create Date: 2026-05-23
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "031_onboarding_drafts"
down_revision: Union[str, None] = "030_add_refresh_token_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "onboarding_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_onboarding_drafts_user_id"),
    )
    op.create_index("ix_onboarding_drafts_user_id", "onboarding_drafts", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_onboarding_drafts_user_id", table_name="onboarding_drafts")
    op.drop_table("onboarding_drafts")

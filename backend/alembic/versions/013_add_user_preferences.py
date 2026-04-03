"""Add user_preferences table

Revision ID: 013_add_user_preferences
Revises: 012_remove_height_from_bmi_goals
Create Date: 2026-04-03
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "013_add_user_preferences"
down_revision: Union[str, None] = "012_remove_height_from_bmi_goals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("theme_mode", sa.String(10), nullable=False, server_default="system"),
        sa.Column("accent_color", sa.String(7), nullable=True),
        sa.Column("appearance", JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_user_preferences_user_id"), "user_preferences", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_preferences_user_id"), table_name="user_preferences")
    op.drop_table("user_preferences")

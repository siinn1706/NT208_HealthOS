"""Add refresh_token_sessions table for rotating refresh-token auth.

Revision ID: 030_add_refresh_token_sessions
Revises: 029_merge_auth_and_ai_heads
Create Date: 2026-05-19
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "030_add_refresh_token_sessions"
down_revision: Union[str, None] = "029_merge_auth_and_ai_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_token_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["replaced_by_id"], ["refresh_token_sessions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_refresh_token_sessions_user_id",
        "refresh_token_sessions",
        ["user_id"],
    )
    op.create_index(
        "ix_refresh_token_sessions_token_hash",
        "refresh_token_sessions",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_refresh_token_sessions_family_id",
        "refresh_token_sessions",
        ["family_id"],
    )
    op.create_index(
        "ix_refresh_token_sessions_expires_at",
        "refresh_token_sessions",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_token_sessions_expires_at", table_name="refresh_token_sessions")
    op.drop_index("ix_refresh_token_sessions_family_id", table_name="refresh_token_sessions")
    op.drop_index("ix_refresh_token_sessions_token_hash", table_name="refresh_token_sessions")
    op.drop_index("ix_refresh_token_sessions_user_id", table_name="refresh_token_sessions")
    op.drop_table("refresh_token_sessions")

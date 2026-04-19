"""B7 P1 — extend notifications: kind/reference_id/link/read_at + indexes.

Revision ID: 014_b7_notifications_columns_and_indexes
Revises: 013_add_user_preferences
Create Date: 2026-04-19

Adds the columns the popover + reminder firing pipeline rely on, plus the
two indexes that keep `unread_count` and the cursor list cheap at scale.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "014_b7_notifications_columns_and_indexes"
down_revision: Union[str, None] = "013_add_user_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("kind", sa.String(32), nullable=False, server_default=sa.text("'info'")),
    )
    op.add_column(
        "notifications",
        sa.Column("reference_id", UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("link", sa.String(512), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Newest-first scans for the cursor-paginated list.
    op.create_index(
        "ix_notifications_user_created",
        "notifications",
        ["user_id", sa.text("created_at DESC")],
    )
    # Partial index keeps unread-count O(log unread) without bloating writes.
    op.create_index(
        "ix_notifications_unread_partial",
        "notifications",
        ["user_id"],
        postgresql_where=sa.text("is_read = false"),
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_unread_partial", table_name="notifications")
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "link")
    op.drop_column("notifications", "reference_id")
    op.drop_column("notifications", "kind")

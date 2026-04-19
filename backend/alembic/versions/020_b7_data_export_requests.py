"""B7 P8 — data_export_requests table.

Revision ID: 020_b7_data_export_requests
Revises: 019_b7_messages_status_column
Create Date: 2026-04-19
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "020_b7_data_export_requests"
down_revision: Union[str, None] = "019_b7_messages_status_column"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_export_requests",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bucket", sa.String(255), nullable=True),
        sa.Column("key", sa.String(512), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bytes", sa.Integer, nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_data_export_requests_user_id",
        "data_export_requests",
        ["user_id"],
    )
    op.create_index(
        "ix_data_export_requests_expires_at",
        "data_export_requests",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_data_export_requests_expires_at", table_name="data_export_requests")
    op.drop_index("ix_data_export_requests_user_id", table_name="data_export_requests")
    op.drop_table("data_export_requests")

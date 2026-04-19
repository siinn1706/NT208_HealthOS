"""B7 P10 — report_export_requests table.

Revision ID: 022_b7_report_export_requests
Revises: 021_b7_users_soft_delete
Create Date: 2026-04-19
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "022_b7_report_export_requests"
down_revision: Union[str, None] = "021_b7_users_soft_delete"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report_export_requests",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("period", sa.String(8), nullable=False),
        sa.Column("sections", JSONB, nullable=False),
        sa.Column("locale", sa.String(8), nullable=False, server_default=sa.text("'en'")),
        sa.Column(
            "include_sensitive",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
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
        "ix_report_export_requests_user_id",
        "report_export_requests",
        ["user_id"],
    )
    op.create_index(
        "ix_report_export_requests_expires_at",
        "report_export_requests",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_report_export_requests_expires_at", table_name="report_export_requests")
    op.drop_index("ix_report_export_requests_user_id", table_name="report_export_requests")
    op.drop_table("report_export_requests")

"""B7 P4 — prescription_assets table.

Revision ID: 017_b7_prescription_assets
Revises: 016_b7_oauth_accounts
Create Date: 2026-04-19
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "017_b7_prescription_assets"
down_revision: Union[str, None] = "016_b7_oauth_accounts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "prescription_assets",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("appointment_id", UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by", UUID(as_uuid=True), nullable=True),
        sa.Column("bucket", sa.String(255), nullable=False),
        sa.Column("key", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("original_filename", sa.String(512), nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_prescription_assets_appointment_id",
        "prescription_assets",
        ["appointment_id"],
    )
    op.create_index("ix_prescription_assets_sha256", "prescription_assets", ["sha256"])
    # Live (non-deleted) assets per appointment — keeps the listing endpoint cheap.
    op.create_index(
        "ix_prescription_assets_live",
        "prescription_assets",
        ["appointment_id", "uploaded_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_prescription_assets_live", table_name="prescription_assets")
    op.drop_index("ix_prescription_assets_sha256", table_name="prescription_assets")
    op.drop_index("ix_prescription_assets_appointment_id", table_name="prescription_assets")
    op.drop_table("prescription_assets")

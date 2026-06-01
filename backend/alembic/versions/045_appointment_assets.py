"""Add generic appointment assets.

Revision ID: 045_appointment_assets
Revises: 044_medication_audit_events
Create Date: 2026-06-01
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "045_appointment_assets"
down_revision: Union[str, None] = "044_medication_audit_events"
branch_labels = None
depends_on = None

APPOINTMENT_ASSET_AUDIT_EVENTS = (
    "appointment_asset_uploaded",
    "appointment_asset_downloaded",
    "appointment_asset_deleted",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for event in APPOINTMENT_ASSET_AUDIT_EVENTS:
            op.execute(f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{event}'")

    op.create_table(
        "appointment_assets",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("appointment_id", UUID(as_uuid=True), nullable=False),
        sa.Column("uploaded_by", UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(32), nullable=False),
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
        "ix_appointment_assets_appointment_kind",
        "appointment_assets",
        ["appointment_id", "kind"],
    )
    op.create_index("ix_appointment_assets_sha256", "appointment_assets", ["sha256"])
    op.create_index(
        "ix_appointment_assets_live",
        "appointment_assets",
        ["appointment_id", "kind", "uploaded_at"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_appointment_assets_live", table_name="appointment_assets")
    op.drop_index("ix_appointment_assets_sha256", table_name="appointment_assets")
    op.drop_index("ix_appointment_assets_appointment_kind", table_name="appointment_assets")
    op.drop_table("appointment_assets")

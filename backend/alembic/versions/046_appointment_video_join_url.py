"""Add appointment video join metadata.

Revision ID: 046_appointment_video_join_url
Revises: 045_appointment_assets
Create Date: 2026-06-01
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_appointment_video_join_url"
down_revision: Union[str, None] = "045_appointment_assets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column(
            "visit_type",
            sa.String(32),
            nullable=False,
            server_default=sa.text("'in_person'"),
        ),
    )
    op.add_column(
        "appointments",
        sa.Column("video_join_url", sa.String(2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("appointments", "video_join_url")
    op.drop_column("appointments", "visit_type")

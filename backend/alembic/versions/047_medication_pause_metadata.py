"""Add medication pause metadata.

Revision ID: 047_medication_pause_metadata
Revises: 046_appointment_video_join_url
Create Date: 2026-06-01
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "047_medication_pause_metadata"
down_revision: Union[str, None] = "046_appointment_video_join_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "medication_plans",
        sa.Column("pause_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "medication_plans",
        sa.Column("pause_reason", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_medication_plans_pause_until",
        "medication_plans",
        ["pause_until"],
    )


def downgrade() -> None:
    op.drop_index("ix_medication_plans_pause_until", table_name="medication_plans")
    op.drop_column("medication_plans", "pause_reason")
    op.drop_column("medication_plans", "pause_until")

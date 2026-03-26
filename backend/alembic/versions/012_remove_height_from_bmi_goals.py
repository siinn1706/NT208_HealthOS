"""Remove current_height_cm from user_bmi_goals table.

Revision ID: 012_remove_height_from_bmi_goals
Revises: 011_add_bmi_weight_goals
Create Date: 2026-03-26
"""
from __future__ import annotations

from alembic import op


revision = "012_remove_height_from_bmi_goals"
down_revision = "011_add_bmi_weight_goals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE user_bmi_goals DROP COLUMN IF EXISTS current_height_cm;")


def downgrade() -> None:
    op.execute("""
    ALTER TABLE user_bmi_goals ADD COLUMN current_height_cm FLOAT
        CHECK (current_height_cm BETWEEN 100.0 AND 220.0);
    """)

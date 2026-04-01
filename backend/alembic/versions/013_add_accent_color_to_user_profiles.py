"""Add accent_color to user_profiles.

Revision ID: 013_add_accent_color_to_user_profiles
Revises: 012_remove_height_from_bmi_goals
Create Date: 2026-04-01
"""
from __future__ import annotations

from alembic import op


# revision identifiers
revision = "013_add_accent_color_to_user_profiles"
down_revision = "012_remove_height_from_bmi_goals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE user_profiles
        DROP COLUMN IF EXISTS accent_color;
        """
    )


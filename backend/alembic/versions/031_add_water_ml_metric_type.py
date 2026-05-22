"""Add water_ml to metric_type_enum.

Revision ID: 031_add_water_ml_metric_type
Revises: 030_add_refresh_token_sessions
Create Date: 2026-05-22
"""
from __future__ import annotations

from alembic import op


revision: str = "031_add_water_ml_metric_type"
down_revision: str = "030_add_refresh_token_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE metric_type_enum ADD VALUE IF NOT EXISTS 'water_ml'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; leave as-is.
    pass

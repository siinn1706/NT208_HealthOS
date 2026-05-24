"""Health metrics analytics active-row composite index.

Revision ID: 034_health_metrics_analytics_index
Revises: 033_perf_indexes
Create Date: 2026-05-23
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "034_health_metrics_analytics_index"
down_revision: Union[str, None] = "033_perf_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_health_metrics_user_type_recorded_active",
        "health_metrics",
        ["user_id", "metric_type", sa.text("recorded_at DESC")],
        postgresql_where=sa.text("is_deleted = false"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_health_metrics_user_type_recorded_active",
        table_name="health_metrics",
    )

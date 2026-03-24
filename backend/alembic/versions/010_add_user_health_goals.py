"""Add user health goals table.

Revision ID: 010_add_user_health_goals
Revises: 009_add_security_audit_log
Create Date: 2026-03-24
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op


# revision identifiers
revision = "010_add_user_health_goals"
down_revision = "009_add_security_audit_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_health_goals",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("metric_type", sa.String(50), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.Column("period_type", sa.String(20), nullable=False, server_default="daily"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "metric_type", "period_type", name="uq_user_metric_period"),
    )
    op.create_index("ix_user_health_goals_user_metric", "user_health_goals", ["user_id", "metric_type"])


def downgrade() -> None:
    op.drop_table("user_health_goals")

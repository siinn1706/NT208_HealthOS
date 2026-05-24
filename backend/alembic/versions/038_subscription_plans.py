"""Add subscription plans and user subscriptions.

Revision ID: 038_subscription_plans
Revises: 037_admin_user_controls
Create Date: 2026-05-24
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "038_subscription_plans"
down_revision = "037_admin_user_controls"
branch_labels = None
depends_on = None


def _seed_path() -> Path:
    return Path(__file__).resolve().parents[2] / "app" / "seeds" / "subscription_plans.json"


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name_vi", sa.String(255), nullable=False),
        sa.Column("name_en", sa.String(255), nullable=True),
        sa.Column("description_vi", sa.Text(), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=True),
        sa.Column("price_vnd", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("billing_period", sa.String(16), nullable=False),
        sa.Column("features_vi", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("features_en", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("limits", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_recommended", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("billing_period IN ('free', 'monthly', 'yearly')", name="ck_subscription_plans_billing_period"),
        sa.CheckConstraint("price_vnd >= 0", name="ck_subscription_plans_price_nonnegative"),
        sa.UniqueConstraint("code", name="uq_subscription_plans_code"),
    )
    op.create_index("ix_subscription_plans_code", "subscription_plans", ["code"], unique=True)
    op.create_index("ix_subscription_plans_active_sort", "subscription_plans", ["is_active", "sort_order"], unique=False)

    op.create_table(
        "user_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default=sa.text("'active'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_by_admin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')",
            name="ck_user_subscriptions_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["assigned_by_admin_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_user_subscriptions_user_id", "user_subscriptions", ["user_id"], unique=False)
    op.create_index("ix_user_subscriptions_plan_id", "user_subscriptions", ["plan_id"], unique=False)
    op.create_index("ix_user_subscriptions_status", "user_subscriptions", ["status"], unique=False)
    op.create_index("ix_user_subscriptions_assigned_by_admin_id", "user_subscriptions", ["assigned_by_admin_id"], unique=False)
    op.create_index(
        "uq_user_subscriptions_one_current",
        "user_subscriptions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('active', 'trialing')"),
    )

    seed_path = _seed_path()
    if seed_path.exists():
        rows = json.loads(seed_path.read_text(encoding="utf-8"))
        conn = op.get_bind()
        for row in rows:
            conn.execute(
                sa.text(
                    """
                    INSERT INTO subscription_plans (
                        id, code, name_vi, name_en, description_vi, description_en,
                        price_vnd, billing_period, features_vi, features_en, limits,
                        is_active, is_recommended, sort_order
                    )
                    VALUES (
                        :id, :code, :name_vi, :name_en, :description_vi, :description_en,
                        :price_vnd, :billing_period, CAST(:features_vi AS JSONB),
                        CAST(:features_en AS JSONB), CAST(:limits AS JSONB),
                        true, :is_recommended, :sort_order
                    )
                    ON CONFLICT (code) DO UPDATE SET
                        name_vi = EXCLUDED.name_vi,
                        name_en = EXCLUDED.name_en,
                        description_vi = EXCLUDED.description_vi,
                        description_en = EXCLUDED.description_en,
                        price_vnd = EXCLUDED.price_vnd,
                        billing_period = EXCLUDED.billing_period,
                        features_vi = EXCLUDED.features_vi,
                        features_en = EXCLUDED.features_en,
                        limits = EXCLUDED.limits,
                        is_active = EXCLUDED.is_active,
                        is_recommended = EXCLUDED.is_recommended,
                        sort_order = EXCLUDED.sort_order,
                        updated_at = now()
                    """
                ),
                {
                    **row,
                    "id": uuid.uuid4(),
                    "features_vi": json.dumps(row["features_vi"], ensure_ascii=False),
                    "features_en": json.dumps(row.get("features_en"), ensure_ascii=False),
                    "limits": json.dumps(row["limits"], ensure_ascii=False),
                },
            )


def downgrade() -> None:
    op.drop_index("uq_user_subscriptions_one_current", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_assigned_by_admin_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_status", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_plan_id", table_name="user_subscriptions")
    op.drop_index("ix_user_subscriptions_user_id", table_name="user_subscriptions")
    op.drop_table("user_subscriptions")
    op.drop_index("ix_subscription_plans_active_sort", table_name="subscription_plans")
    op.drop_index("ix_subscription_plans_code", table_name="subscription_plans")
    op.drop_table("subscription_plans")

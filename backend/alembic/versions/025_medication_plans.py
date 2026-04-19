"""Medication Hub — `medication_plans` table + nullable FK on `reminders`.

Revision ID: 025_medication_plans
Revises: 024_health_connect_sync
Create Date: 2026-04-19

Additive migration:
  * `medication_plans` is a fresh table — one row per drug a user is taking,
    with metadata (name, strength, form, instructions, prescriber, etc.),
    refill state, and optional provenance pointing at the appointment whose
    prescription it was imported from.
  * `reminders.medication_plan_id` is added as a nullable FK so that existing
    reminders survive untouched. Plan-owned dose reminders are linked via
    this column; standalone reminders keep `medication_plan_id IS NULL`.

No backfill — feature is opt-in. Existing medicine-typed reminders coexist as
"unowned" reminders on the reminders page; they do not contribute to any
medication adherence number.

Downgrade is symmetric: drop the FK column first, then drop the table.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "025_medication_plans"
down_revision: Union[str, None] = "024_health_connect_sync"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "medication_plans",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("appointment_id", UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("generic_name", sa.String(255), nullable=True),
        sa.Column("strength", sa.String(64), nullable=True),
        sa.Column("form", sa.String(32), nullable=True),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column("prescriber", sa.String(255), nullable=True),
        sa.Column("clinic", sa.String(255), nullable=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "tzid",
            sa.String(64),
            nullable=False,
            server_default=sa.text("'Asia/Ho_Chi_Minh'"),
        ),
        sa.Column("refill_supply_units", sa.Integer, nullable=True),
        sa.Column("refill_cadence_days", sa.Integer, nullable=True),
        sa.Column("last_refill_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "next_refill_estimated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("review_due_at", sa.Date, nullable=True),
        sa.Column("dedupe_key", sa.String(128), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["appointment_id"], ["appointments.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        # Per-user dedupe — re-importing the same medicine from the same
        # appointment is a no-op rather than a duplicate row.
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_medication_plan_dedupe"),
    )
    op.create_index(
        "ix_medication_plans_user_id",
        "medication_plans",
        ["user_id"],
    )
    op.create_index(
        "ix_medication_plans_appointment_id",
        "medication_plans",
        ["appointment_id"],
    )
    op.create_index(
        "ix_medication_plans_dedupe_key",
        "medication_plans",
        ["dedupe_key"],
    )
    # Partial index for the daily refill-signals beat — only active plans
    # with a non-null next_refill estimate are candidates for notification.
    op.create_index(
        "ix_medication_plans_refill_due",
        "medication_plans",
        ["next_refill_estimated_at"],
        postgresql_where=sa.text(
            "status = 'active' AND next_refill_estimated_at IS NOT NULL"
        ),
    )

    op.add_column(
        "reminders",
        sa.Column("medication_plan_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_reminders_medication_plan_id",
        "reminders",
        "medication_plans",
        ["medication_plan_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_reminders_medication_plan_id",
        "reminders",
        ["medication_plan_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_reminders_medication_plan_id", table_name="reminders")
    op.drop_constraint(
        "fk_reminders_medication_plan_id", "reminders", type_="foreignkey"
    )
    op.drop_column("reminders", "medication_plan_id")

    op.drop_index("ix_medication_plans_refill_due", table_name="medication_plans")
    op.drop_index("ix_medication_plans_dedupe_key", table_name="medication_plans")
    op.drop_index("ix_medication_plans_appointment_id", table_name="medication_plans")
    op.drop_index("ix_medication_plans_user_id", table_name="medication_plans")
    op.drop_table("medication_plans")

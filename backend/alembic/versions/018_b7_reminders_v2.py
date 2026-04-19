"""B7 P5 — reminders schedule columns + reminder_occurrences table.

Revision ID: 018_b7_reminders_v2
Revises: 017_b7_prescription_assets
Create Date: 2026-04-19

Additive migration:
  * `reminders` gets tzid / time_of_day / weekday_mask / day_of_month / start_date
    / end_date / next_occurrence_at / is_active. Old `remind_time` and `done`
    survive (the new code reads them as fallbacks for legacy rows).
  * `reminder_occurrences` is a fresh table — one row per materialized firing
    slot, with a status FSM (`pending|fired|done|skipped|snoozed|missed`).

Backfill: for each existing reminder, copy `remind_time::time` into
`time_of_day`, `created_at::date` into `start_date`, and set `tzid`
to Asia/Ho_Chi_Minh (the implicit default of the legacy code).
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "018_b7_reminders_v2"
down_revision: Union[str, None] = "017_b7_prescription_assets"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Additive columns on reminders.
    op.add_column(
        "reminders",
        sa.Column("tzid", sa.String(64), nullable=False, server_default=sa.text("'Asia/Ho_Chi_Minh'")),
    )
    op.add_column("reminders", sa.Column("time_of_day", sa.Time, nullable=True))
    op.add_column("reminders", sa.Column("weekday_mask", sa.Integer, nullable=True))
    op.add_column("reminders", sa.Column("day_of_month", sa.Integer, nullable=True))
    op.add_column("reminders", sa.Column("start_date", sa.Date, nullable=True))
    op.add_column("reminders", sa.Column("end_date", sa.Date, nullable=True))
    op.add_column(
        "reminders",
        sa.Column("next_occurrence_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "reminders",
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )
    op.create_index(
        "ix_reminders_next_occurrence_at",
        "reminders",
        ["next_occurrence_at"],
    )

    # 2. Backfill schedule fields from legacy columns.
    op.execute(
        """
        UPDATE reminders
        SET time_of_day = (
            CASE
                WHEN remind_time ~ '^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$'
                    THEN CAST(remind_time AS time)
                ELSE NULL
            END
        ),
            start_date = COALESCE(start_date, created_at::date)
        """
    )

    # 3. New occurrence table.
    op.create_table(
        "reminder_occurrences",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("reminder_id", UUID(as_uuid=True), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("done_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("skipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fired_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notification_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reminder_id"], ["reminders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "reminder_id", "scheduled_at", name="uq_reminder_occurrence_slot"
        ),
    )
    op.create_index(
        "ix_reminder_occurrences_reminder_id",
        "reminder_occurrences",
        ["reminder_id"],
    )
    op.create_index(
        "ix_reminder_occurrences_due",
        "reminder_occurrences",
        ["scheduled_at"],
        postgresql_where=sa.text("status IN ('pending', 'snoozed')"),
    )


def downgrade() -> None:
    op.drop_index("ix_reminder_occurrences_due", table_name="reminder_occurrences")
    op.drop_index("ix_reminder_occurrences_reminder_id", table_name="reminder_occurrences")
    op.drop_table("reminder_occurrences")

    op.drop_index("ix_reminders_next_occurrence_at", table_name="reminders")
    op.drop_column("reminders", "is_active")
    op.drop_column("reminders", "next_occurrence_at")
    op.drop_column("reminders", "end_date")
    op.drop_column("reminders", "start_date")
    op.drop_column("reminders", "day_of_month")
    op.drop_column("reminders", "weekday_mask")
    op.drop_column("reminders", "time_of_day")
    op.drop_column("reminders", "tzid")

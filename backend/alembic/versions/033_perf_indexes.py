"""Hot-path composite indexes for meals, appointments, and messages.

Revision ID: 033_perf_indexes
Revises: 032_plans
Create Date: 2026-05-23

Adds three composite indexes that collapse existing single-column indexes into
covering scans for the most frequent query patterns:

  * meals(user_id, logged_at DESC)     — date-range list queries in meal diary
  * appointments(user_id, appointment_date) — upcoming/history appointment list
  * messages(conversation_id, created_at DESC) — cursor-paginated message list

Reminders skipped: ix_reminders_next_occurrence_at already exists (018_b7).
Notifications skipped: ix_notifications_user_created already exists (014_b7).
Plans skipped: ix_plans_user_status already exists (032_plans).
Devices/wearables: out of scope.

Production note: for tables with millions of rows use
  CREATE INDEX CONCURRENTLY
instead; this migration uses plain CREATE INDEX (safe for test/staging).
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "033_perf_indexes"
down_revision: Union[str, None] = "032_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Meal diary: list queries filter by user and sort/filter by date.
    op.create_index(
        "ix_meals_user_logged_at",
        "meals",
        ["user_id", sa.text("logged_at DESC")],
    )

    # Appointment list: composite replaces separate user_id + appointment_date scans.
    # Existing ix_appointments_user_id and ix_appointments_date remain; this
    # composite is more selective for combined WHERE + ORDER BY.
    op.create_index(
        "ix_appointments_user_date",
        "appointments",
        ["user_id", "appointment_date"],
    )

    # Message pagination: conversation + newest-first ordering.
    op.create_index(
        "ix_messages_conversation_created",
        "messages",
        ["conversation_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_index("ix_appointments_user_date", table_name="appointments")
    op.drop_index("ix_meals_user_logged_at", table_name="meals")

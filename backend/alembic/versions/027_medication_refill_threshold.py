"""Medication Hub — track last fired refill alert threshold per supply cycle.

Revision ID: 027_medication_refill_threshold
Revises: 026_emergency_profile_share
Create Date: 2026-04-19

Additive: adds `medication_plans.last_refill_alert_threshold INTEGER NULL`.
Used by `app.tasks.medications.compute_medication_signals` to fire alerts
on threshold *crossings* rather than exact matches — so a supply that drops
from 8 days remaining to 5 days remaining still triggers the 7-day alert.
NULL means "no alert fired yet for the current supply cycle"; reset to NULL
on `log_refill`.

Reverses cleanly by dropping the column.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "027_medication_refill_threshold"
down_revision: Union[str, None] = "026_emergency_profile_share"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "medication_plans",
        sa.Column("last_refill_alert_threshold", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("medication_plans", "last_refill_alert_threshold")

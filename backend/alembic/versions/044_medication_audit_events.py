"""Add medication audit event enum values.

Revision ID: 044_medication_audit_events
Revises: 043_appointment_prep_checklists
Create Date: 2026-05-30
"""
from __future__ import annotations

from typing import Union

from alembic import op

revision: str = "044_medication_audit_events"
down_revision: Union[str, None] = "043_appointment_prep_checklists"
branch_labels = None
depends_on = None

MEDICATION_AUDIT_EVENTS = (
    "medication_plan_created",
    "medication_plan_updated",
    "medication_plan_paused",
    "medication_plan_resumed",
    "medication_plan_deleted",
    "medication_refill_logged",
    "medication_imported_from_appointment",
    "medication_summary_exported",
)


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for event in MEDICATION_AUDIT_EVENTS:
            op.execute(f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{event}'")


def downgrade() -> None:
    # PostgreSQL cannot remove enum values without rebuilding the type.
    pass

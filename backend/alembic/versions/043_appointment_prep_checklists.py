"""Add appointment prep checklists.

Revision ID: 043_appointment_prep_checklists
Revises: 042_merge_wearable_and_medical_knowledge_heads
Create Date: 2026-05-30
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "043_appointment_prep_checklists"
down_revision: Union[str, None] = "042_merge_wearable_and_medical_knowledge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "appointment_preps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("appointment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "checklist_items",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id", name="uq_appointment_preps_appointment_id"),
    )
    op.create_index(
        "ix_appointment_preps_user_appointment",
        "appointment_preps",
        ["user_id", "appointment_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_appointment_preps_user_appointment", table_name="appointment_preps")
    op.drop_table("appointment_preps")

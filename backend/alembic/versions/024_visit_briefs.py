"""Pre-Visit Question Builder — domain tables + seeded question_templates.

Revision ID: 024_visit_briefs
Revises: 023_b7_users_has_password_and_token_invalidation
Create Date: 2026-04-19

Five additive tables and one audit-event enum value:

  * visit_briefs               — header / lifecycle
  * symptom_entries            — 1..5 concerns per brief
  * triage_outcomes            — append-only routing audit
  * question_sets              — 1:1 question list per brief
  * question_templates         — seeded suggestion bank
  * appointment_brief_links    — brief <-> appointment

Plus:
  * `audit_event_type_enum` gains `visit_brief_triage_computed` so we can
    audit high-bucket triage outcomes via the existing audit pipeline.

The migration is fully additive — downgrade drops the new tables but does
not (and cannot, on Postgres < 15) remove the audit enum value. Recovery
remains forward-only, matching the existing convention from migration 015.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "024_visit_briefs"
down_revision: Union[str, None] = "023_b7_users_has_password_and_token_invalidation"
branch_labels = None
depends_on = None


NEW_AUDIT_EVENTS = ("visit_brief_triage_computed",)


def _seed_path() -> Path:
    return Path(__file__).resolve().parents[2] / "app" / "seeds" / "question_templates.json"


def upgrade() -> None:
    # 1. Extend audit_event_type_enum (autocommit_block — Postgres < 15 forbids
    #    `ALTER TYPE … ADD VALUE` inside a transaction).
    with op.get_context().autocommit_block():
        for value in NEW_AUDIT_EVENTS:
            op.execute(
                f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{value}'"
            )

    # 2. visit_briefs
    op.create_table(
        "visit_briefs",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("visit_type", sa.String(32), nullable=False, server_default=sa.text("'gp_routine'")),
        sa.Column("status", sa.String(16), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("revision", sa.Integer, nullable=False, server_default=sa.text("1")),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_visit_briefs_user_id", "visit_briefs", ["user_id"])
    op.create_index("ix_visit_briefs_status", "visit_briefs", ["status"])
    op.create_index("ix_visit_briefs_user_status", "visit_briefs", ["user_id", "status"])

    # 3. symptom_entries
    op.create_table(
        "symptom_entries",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("visit_brief_id", UUID(as_uuid=True), nullable=False),
        sa.Column("concern_text", sa.String(500), nullable=False),
        sa.Column("concern_category", sa.String(16), nullable=False, server_default=sa.text("'other'")),
        sa.Column("onset_date", sa.Date, nullable=True),
        sa.Column("duration_value", sa.Integer, nullable=True),
        sa.Column("duration_unit", sa.String(16), nullable=True),
        sa.Column("severity_0_10", sa.Integer, nullable=True),
        sa.Column("triggers", sa.String(1000), nullable=True),
        sa.Column("better_with", sa.String(1000), nullable=True),
        sa.Column("worse_with", sa.String(1000), nullable=True),
        sa.Column("meds_taken", sa.String(1000), nullable=True),
        sa.Column("prior_care", sa.String(1000), nullable=True),
        sa.Column("context", JSONB, nullable=True),
        sa.Column("order_index", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["visit_brief_id"], ["visit_briefs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_symptom_entries_visit_brief_id", "symptom_entries", ["visit_brief_id"])

    # 4. triage_outcomes — append-only audit table
    op.create_table(
        "triage_outcomes",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("visit_brief_id", UUID(as_uuid=True), nullable=False),
        sa.Column("ruleset_version", sa.String(16), nullable=False),
        sa.Column("bucket", sa.String(32), nullable=False),
        sa.Column("matched_signals", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("inputs_snapshot", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("inputs_hash", sa.String(64), nullable=False),
        sa.Column("disclaimer_version", sa.String(16), nullable=False),
        sa.Column("next_action_copy_key", sa.String(128), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["visit_brief_id"], ["visit_briefs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_triage_outcomes_visit_brief_id", "triage_outcomes", ["visit_brief_id"])
    op.create_index("ix_triage_outcomes_inputs_hash", "triage_outcomes", ["inputs_hash"])
    op.create_index("ix_triage_outcomes_computed_at", "triage_outcomes", ["computed_at"])

    # 5. question_sets — 1:1 with brief
    op.create_table(
        "question_sets",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("visit_brief_id", UUID(as_uuid=True), nullable=False),
        sa.Column("questions", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["visit_brief_id"], ["visit_briefs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("visit_brief_id", name="uq_question_set_brief"),
    )

    # 6. question_templates — read-only catalog
    op.create_table(
        "question_templates",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("visit_type", sa.String(32), nullable=True),
        sa.Column("concern_category", sa.String(16), nullable=True),
        sa.Column("text_vi", sa.String(500), nullable=False),
        sa.Column("text_en", sa.String(500), nullable=False),
        sa.Column("default_order", sa.Integer, nullable=False, server_default=sa.text("100")),
        sa.Column("is_canonical", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_question_template_slug"),
    )
    op.create_index("ix_question_templates_slug", "question_templates", ["slug"], unique=True)
    op.create_index("ix_question_templates_visit_type", "question_templates", ["visit_type"])
    op.create_index("ix_question_templates_concern_category", "question_templates", ["concern_category"])

    # 7. appointment_brief_links
    op.create_table(
        "appointment_brief_links",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("visit_brief_id", UUID(as_uuid=True), nullable=False),
        sa.Column("appointment_id", UUID(as_uuid=True), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("attached_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("detached_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["visit_brief_id"], ["visit_briefs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("visit_brief_id", "appointment_id", name="uq_brief_appointment"),
    )
    op.create_index("ix_appointment_brief_links_visit_brief_id", "appointment_brief_links", ["visit_brief_id"])
    op.create_index("ix_appointment_brief_links_appointment_id", "appointment_brief_links", ["appointment_id"])
    # Only one active link per appointment — enforced at the DB layer.
    op.create_index(
        "uq_appointment_brief_links_one_active",
        "appointment_brief_links",
        ["appointment_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # 8. Seed question_templates from the JSON bundle.
    seed_path = _seed_path()
    if seed_path.exists():
        rows = json.loads(seed_path.read_text(encoding="utf-8"))
        templates_table = sa.table(
            "question_templates",
            sa.column("id", UUID(as_uuid=True)),
            sa.column("slug", sa.String),
            sa.column("visit_type", sa.String),
            sa.column("concern_category", sa.String),
            sa.column("text_vi", sa.String),
            sa.column("text_en", sa.String),
            sa.column("default_order", sa.Integer),
            sa.column("is_canonical", sa.Boolean),
        )
        if rows:
            op.bulk_insert(
                templates_table,
                [
                    {
                        "id": uuid.uuid4(),
                        "slug": row["slug"],
                        "visit_type": row.get("visit_type"),
                        "concern_category": row.get("concern_category"),
                        "text_vi": row["text_vi"],
                        "text_en": row["text_en"],
                        "default_order": int(row.get("default_order", 100)),
                        "is_canonical": bool(row.get("is_canonical", False)),
                    }
                    for row in rows
                ],
            )


def downgrade() -> None:
    op.drop_index("ix_appointment_brief_links_appointment_id", table_name="appointment_brief_links")
    op.drop_index("ix_appointment_brief_links_visit_brief_id", table_name="appointment_brief_links")
    op.drop_index("uq_appointment_brief_links_one_active", table_name="appointment_brief_links")
    op.drop_table("appointment_brief_links")

    op.drop_index("ix_question_templates_concern_category", table_name="question_templates")
    op.drop_index("ix_question_templates_visit_type", table_name="question_templates")
    op.drop_index("ix_question_templates_slug", table_name="question_templates")
    op.drop_table("question_templates")

    op.drop_table("question_sets")

    op.drop_index("ix_triage_outcomes_computed_at", table_name="triage_outcomes")
    op.drop_index("ix_triage_outcomes_inputs_hash", table_name="triage_outcomes")
    op.drop_index("ix_triage_outcomes_visit_brief_id", table_name="triage_outcomes")
    op.drop_table("triage_outcomes")

    op.drop_index("ix_symptom_entries_visit_brief_id", table_name="symptom_entries")
    op.drop_table("symptom_entries")

    op.drop_index("ix_visit_briefs_user_status", table_name="visit_briefs")
    op.drop_index("ix_visit_briefs_status", table_name="visit_briefs")
    op.drop_index("ix_visit_briefs_user_id", table_name="visit_briefs")
    op.drop_table("visit_briefs")

    # NOTE: enum value removal is forward-only (matches migration 015 convention).

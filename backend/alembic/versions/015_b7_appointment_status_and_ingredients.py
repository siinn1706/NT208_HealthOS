"""B7 P2 — extend appointment_status_enum + create ingredients table + backfill.

Revision ID: 015_b7_appt_ingredients
Revises: 014_b7_notif_cols_idx
Create Date: 2026-04-19

Two slices:
  * Postgres `appointment_status_enum` gets BOOKED / SCHEDULED / IN_PROGRESS /
    NO_SHOW / RESCHEDULED appended (FE already declares all of these). Note:
    `ALTER TYPE … ADD VALUE` runs inside an autocommit block because
    Postgres < 15 forbids it inside a transaction.
  * `ingredients` table replaces the FE-only static dataset. Backfilled from
    `backend/app/seeds/ingredients.json`.
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "015_b7_appt_ingredients"
down_revision: Union[str, None] = "014_b7_notif_cols_idx"
branch_labels = None
depends_on = None


# Postgres enum extension must run outside the migration's own transaction.
# Alembic's `autocommit_block()` opens an inner unmanaged connection for that.
NEW_APPOINTMENT_STATUSES = ("booked", "scheduled", "in_progress", "no_show", "rescheduled")


def _seed_path() -> Path:
    return Path(__file__).resolve().parents[2] / "app" / "seeds" / "ingredients.json"


def upgrade() -> None:
    # 1. Extend appointment_status_enum (each value is a separate statement).
    with op.get_context().autocommit_block():
        for value in NEW_APPOINTMENT_STATUSES:
            op.execute(
                f"ALTER TYPE appointment_status_enum ADD VALUE IF NOT EXISTS '{value}'"
            )

    # 2. Create ingredients table.
    op.create_table(
        "ingredients",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("name_vi", sa.String(255), nullable=False),
        sa.Column("name_en", sa.String(255), nullable=False),
        sa.Column("category", sa.String(32), nullable=False, server_default=sa.text("'other'")),
        sa.Column("calories_per_100g", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("protein_per_100g", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("carbs_per_100g", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("fat_per_100g", sa.Float, nullable=False, server_default=sa.text("0")),
        sa.Column("unit_hint", sa.String(32), nullable=False, server_default=sa.text("'gram'")),
        sa.Column("source", sa.String(16), nullable=False, server_default=sa.text("'seed'")),
        sa.Column("name_en_verified", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_ingredient_slug"),
    )
    op.create_index("ix_ingredients_slug", "ingredients", ["slug"], unique=True)
    op.create_index("ix_ingredients_name_vi", "ingredients", ["name_vi"])
    op.create_index("ix_ingredients_name_en", "ingredients", ["name_en"])

    # 3. Backfill from the JSON seed shipped alongside this migration.
    seed_path = _seed_path()
    if seed_path.exists():
        rows = json.loads(seed_path.read_text(encoding="utf-8"))
        ingredients_table = sa.table(
            "ingredients",
            sa.column("id", UUID(as_uuid=True)),
            sa.column("slug", sa.String),
            sa.column("name_vi", sa.String),
            sa.column("name_en", sa.String),
            sa.column("category", sa.String),
            sa.column("calories_per_100g", sa.Float),
            sa.column("protein_per_100g", sa.Float),
            sa.column("carbs_per_100g", sa.Float),
            sa.column("fat_per_100g", sa.Float),
            sa.column("unit_hint", sa.String),
            sa.column("source", sa.String),
            sa.column("name_en_verified", sa.Boolean),
        )
        if rows:
            op.bulk_insert(
                ingredients_table,
                [
                    {
                        "id": uuid.uuid4(),
                        "slug": row["slug"],
                        "name_vi": row["name_vi"],
                        "name_en": row["name_en"],
                        "category": row.get("category", "other"),
                        "calories_per_100g": float(row.get("calories_per_100g", 0)),
                        "protein_per_100g": float(row.get("protein_per_100g", 0)),
                        "carbs_per_100g": float(row.get("carbs_per_100g", 0)),
                        "fat_per_100g": float(row.get("fat_per_100g", 0)),
                        "unit_hint": row.get("unit_hint", "gram"),
                        "source": "seed",
                        "name_en_verified": True,
                    }
                    for row in rows
                ],
            )


def downgrade() -> None:
    op.drop_index("ix_ingredients_name_en", table_name="ingredients")
    op.drop_index("ix_ingredients_name_vi", table_name="ingredients")
    op.drop_index("ix_ingredients_slug", table_name="ingredients")
    op.drop_table("ingredients")
    # NOTE: enum value removal is not supported by Postgres without recreating
    # the type. We deliberately leave the new appointment status values in
    # place on downgrade — recovery is forward-only.

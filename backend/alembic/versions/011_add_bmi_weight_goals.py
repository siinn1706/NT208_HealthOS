"""Add BMI/weight goals table.

Revision ID: 011_add_bmi_weight_goals
Revises: 010_add_user_health_goals
Create Date: 2026-03-25
"""
from __future__ import annotations

from alembic import op


# revision identifiers
revision = "011_add_bmi_weight_goals"
down_revision = "010_add_user_health_goals"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Split into two execute() calls — asyncpg can't handle multiple commands in one prepared statement
    op.execute("""
    CREATE TABLE user_bmi_goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_bmi FLOAT CHECK (target_bmi BETWEEN 15.0 AND 35.0),
      target_weight_kg FLOAT CHECK (target_weight_kg BETWEEN 30.0 AND 200.0),
      current_height_cm FLOAT CHECK (current_height_cm BETWEEN 100.0 AND 220.0),
      deadline DATE CHECK (deadline >= CURRENT_DATE),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """)
    op.execute("CREATE INDEX ix_user_bmi_goals_user_id ON user_bmi_goals(user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS user_bmi_goals;")

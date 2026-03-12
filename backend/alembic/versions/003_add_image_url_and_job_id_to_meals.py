"""add_image_url_and_job_id_to_meals

Revision ID: 003
Revises: 002
Create Date: 2025-03-11 00:00:00.000000

Adds image_url and job_id columns to meals table for async photo analysis.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "meals",
        sa.Column("image_url", sa.String(512), nullable=True),
    )
    op.add_column(
        "meals",
        sa.Column("job_id", sa.String(64), nullable=True),
    )
    op.create_index("ix_meals_job_id", "meals", ["job_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_meals_job_id", table_name="meals")
    op.drop_column("meals", "job_id")
    op.drop_column("meals", "image_url")

"""add_conversation_member_preferences

Revision ID: 004
Revises: 003
Create Date: 2026-03-12 00:00:00.000000

Adds per-user chat preference columns:
  - conversation_members.is_pinned
  - conversation_members.theme_id
"""
from typing import Sequence, Union

from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE conversation_members
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
        """
    )
    op.execute(
        """
        ALTER TABLE conversation_members
        ADD COLUMN IF NOT EXISTS theme_id VARCHAR(64);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE conversation_members
        DROP COLUMN IF EXISTS theme_id;
        """
    )
    op.execute(
        """
        ALTER TABLE conversation_members
        DROP COLUMN IF EXISTS is_pinned;
        """
    )

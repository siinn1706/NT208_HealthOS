"""Add ai_metadata JSONB column to messages.

Revision ID: 015_add_ai_metadata_to_messages
Revises: 014_add_ai_bot_user
Create Date: 2026-04-19

Stores per-message LLM metadata for cost tracking + debug:
  {
    "model": "gemini-2.0-flash",
    "prompt_tokens": 412,
    "completion_tokens": 87,
    "total_tokens": 499,
    "latency_ms": 1820,
    "finish_reason": "stop",
    "is_first": true
  }
"""
from __future__ import annotations

from typing import Union

from alembic import op
from sqlalchemy.dialects.postgresql import JSONB


revision: str = "015_add_ai_metadata_to_messages"
down_revision: Union[str, None] = "014_add_ai_bot_user"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS ai_metadata JSONB;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE messages
        DROP COLUMN IF EXISTS ai_metadata;
        """
    )

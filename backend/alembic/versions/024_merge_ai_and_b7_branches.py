"""Merge AI bot branch and B7 (settings/oauth/audit) branch into single head.

Revision ID: 024_merge_ai_and_b7_branches
Revises: 015_add_ai_metadata_to_messages, 023_b7_users_has_password_and_token_invalidation
Create Date: 2026-04-19

After 013, the migration tree forked into two parallel lines:

  * AI branch  : 014_add_ai_bot_user -> 015_add_ai_metadata_to_messages
  * B7 branch  : 014_b7_notifications_columns_and_indexes -> ... ->
                 023_b7_users_has_password_and_token_invalidation

Running `alembic upgrade head` (singular) on a multi-head tree is ambiguous
and silently no-ops, which is why teammates were ending up with stale schemas
(e.g. the missing `oauth_accounts` table that broke the Google OAuth callback).

This is a no-op merge migration: it has no DDL of its own, it just declares
both prior heads as its parents so the downstream history is linear again.
After this revision lands, `alembic upgrade head` works as expected for
everyone on the team.
"""
from __future__ import annotations

from typing import Sequence, Union

revision: str = "024_merge_ai_and_b7_branches"
down_revision: Union[str, Sequence[str], None] = (
    "015_add_ai_metadata_to_messages",
    "023_b7_users_has_password_and_token_invalidation",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

"""Merge every active migration head into a single canonical path.

Revision ID: 029_merge_auth_and_ai_heads
Revises: 028_user_preferences_locale, 015_add_ai_metadata_to_messages, 024_visit_briefs
Create Date: 2026-04-21

Restores `alembic upgrade head` as the only supported upgrade path so auth
schema (`users.is_system`, `oauth_accounts`, token invalidation columns) and
AI chat schema (`messages.ai_metadata`) cannot drift onto separate heads.
Also folds the independent `024_visit_briefs` branch back into the canonical
upgrade path so the repository truly has a single Alembic head again.
"""
from __future__ import annotations

from typing import Union


revision: str = "029_merge_auth_and_ai_heads"
down_revision: Union[str, tuple[str, ...], None] = (
    "028_user_preferences_locale",
    "015_add_ai_metadata_to_messages",
    "024_visit_briefs",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

"""Add AI bot system user (HealthOS AI Assistant).

Revision ID: 014_add_ai_bot_user
Revises: 013_add_user_preferences
Create Date: 2026-04-19

Adds:
  * ``users.is_system`` boolean column (default ``false``).
  * Idempotent insert of the singleton AI bot user
    (email = ``ai-bot@healthos.local``, username = ``healthos-ai``).

The bot's ``hashed_password`` is set to a non-decryptable sentinel so the
auth service can simply refuse logins for ``is_system = true`` rows. We do
NOT touch ``conversation_members`` here — the chat service adds the bot to
each user's existing AI conversation lazily on first use.
"""
from __future__ import annotations

from typing import Union

from alembic import op


revision: str = "014_add_ai_bot_user"
down_revision: Union[str, None] = "013_add_user_preferences"
branch_labels = None
depends_on = None


_AI_BOT_EMAIL = "ai-bot@healthos.local"
_AI_BOT_USERNAME = "healthos-ai"
_AI_BOT_DISPLAY_NAME = "HealthOS AI Assistant"
_AI_BOT_PASSWORD_SENTINEL = "!ai-system-no-login!"


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_users_is_system ON users (is_system) WHERE is_system = TRUE;
        """
    )
    op.execute(
        f"""
        INSERT INTO users (
            id, email, username, display_name, hashed_password,
            onboarding_status, is_system, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            '{_AI_BOT_EMAIL}',
            '{_AI_BOT_USERNAME}',
            '{_AI_BOT_DISPLAY_NAME}',
            '{_AI_BOT_PASSWORD_SENTINEL}',
            'completed',
            TRUE,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE
        SET is_system = TRUE,
            display_name = EXCLUDED.display_name,
            onboarding_status = 'completed',
            updated_at = NOW();
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        DELETE FROM users WHERE email = '{_AI_BOT_EMAIL}' AND is_system = TRUE;
        """
    )
    op.execute(
        """
        DROP INDEX IF EXISTS ix_users_is_system;
        """
    )
    op.execute(
        """
        ALTER TABLE users DROP COLUMN IF EXISTS is_system;
        """
    )

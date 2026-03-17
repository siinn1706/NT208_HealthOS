"""add_username_and_onboarding_status

Revision ID: 005
Revises: 004
Create Date: 2026-03-16 00:00:00.000000

Adds username and onboarding status columns to users table:
  - users.username (unique, indexed)
  - users.onboarding_status (default='pending')
  - users.onboarding_completed_at (nullable)
  - users.email_verified_at (nullable)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add username column as nullable (for existing users)
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS username VARCHAR(50);
        """
    )

    # Step 2: Generate username for existing users from email
    # Extract part before @ and use as username
    op.execute(
        """
        UPDATE users
        SET username = LOWER(SPLIT_PART(email, '@', 1))
        WHERE username IS NULL;
        """
    )

    # Step 3: Handle potential duplicates (append random suffix)
    # This handles cases where multiple users have same email prefix
    op.execute(
        """
        UPDATE users
        SET username = username || '_' || id::text
        WHERE username IN (
            SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1
        );
        """
    )

    # Step 4: Add unique constraint and index on username
    op.execute(
        """
        ALTER TABLE users
        ADD CONSTRAINT users_username_unique UNIQUE (username);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);
        """
    )

    # Step 5: Add onboarding_status column with default
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) NOT NULL DEFAULT 'pending';
        """
    )

    # Step 6: Add onboarding_completed_at as nullable
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
        """
    )

    # Step 7: Add email_verified_at as nullable
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS email_verified_at;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS onboarding_completed_at;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS onboarding_status;
        """
    )
    op.execute(
        """
        DROP INDEX IF EXISTS ix_users_username;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_username_unique;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        DROP COLUMN IF EXISTS username;
        """
    )

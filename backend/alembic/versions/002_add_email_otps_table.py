"""add_email_otps_table

Revision ID: 002
Revises: 001
Create Date: 2026-03-04 00:00:00.000000

Creates table:
  - email_otps
"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS email_otps (
            id            UUID PRIMARY KEY,
            email         VARCHAR(255) NOT NULL,
            purpose       VARCHAR(64) NOT NULL,
            code_hash     VARCHAR(255) NOT NULL,
            expires_at    TIMESTAMPTZ NOT NULL,
            attempts_left INTEGER NOT NULL DEFAULT 5,
            consumed_at   TIMESTAMPTZ,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_otps_email ON email_otps (email);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_otps_purpose ON email_otps (purpose);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_otps_expires_at ON email_otps (expires_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_email_otps_created_at ON email_otps (created_at);")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_email_otps_email_purpose_created_at "
        "ON email_otps (email, purpose, created_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS email_otps")

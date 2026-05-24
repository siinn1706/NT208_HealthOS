"""Add security_access_denied to audit_event_type_enum.

Revision ID: 031_add_security_access_denied_enum
Revises: 030_add_refresh_token_sessions
Create Date: 2026-05-22
"""
from __future__ import annotations

from alembic import op

revision = "031_add_security_access_denied_enum"
down_revision = "030_add_refresh_token_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS 'security_access_denied'"
        )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; this is intentionally a no-op.
    pass

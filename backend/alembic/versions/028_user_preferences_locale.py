"""Add persisted UI locale to user_preferences.

Revision ID: 028_user_preferences_locale
Revises: 027_medication_refill_threshold, 027_emergency_access_log_fk_fix
Create Date: 2026-04-21

Merges the two 027 heads and adds `locale` (bounded `en` | `vi`) so mobile
language matches theme/accent on GET/PATCH /v1/preferences/me.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "028_user_preferences_locale"
down_revision: Union[str, tuple[str, ...], None] = (
    "027_medication_refill_threshold",
    "027_emergency_access_log_fk_fix",
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("locale", sa.String(2), nullable=False, server_default="en"),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "locale")

"""B7 review fixes — users.has_password + users.tokens_invalidated_at.

Revision ID: 023_b7_users_has_password_and_token_invalidation
Revises: 022_b7_report_export_requests
Create Date: 2026-04-19

Closes review findings P0-2, P1-7, and P1-5:

  * `has_password` replaces the broken `_looks_like_oauth_placeholder` heuristic.
    Defaults to `true` for legacy rows so existing OAuth-only users retain the
    pre-fix behavior until they're nudged through a password-set flow OR a
    backfill script flips them to `false`.

  * `tokens_invalidated_at` is the cutoff used by `get_current_user` to reject
    tokens minted before this timestamp. Lets `revoke_all_for_user` actually
    revoke every device's session rather than only the caller's JWT.

Both columns are additive; downgrade is straightforward.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_b7_users_has_password_and_token_invalidation"
down_revision: Union[str, None] = "022_b7_report_export_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "has_password",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "users",
        sa.Column("tokens_invalidated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "tokens_invalidated_at")
    op.drop_column("users", "has_password")

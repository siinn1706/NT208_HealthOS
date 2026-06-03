"""B7 P3 — oauth_accounts table + extend audit_event_type_enum.

Revision ID: 016_b7_oauth_accounts
Revises: 015_b7_appt_ingredients
Create Date: 2026-04-19

`oauth_accounts` is the substrate for "Settings → Linked Accounts" and for the
sign-in path that needs a stable (provider, provider_account_id) → user lookup.

Audit enum gets the full B7 event vocabulary added in one shot — cheaper than
extending the enum once per phase, and the values are documented in
[backend/app/models/audit.py](backend/app/models/audit.py).
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "016_b7_oauth_accounts"
down_revision: Union[str, None] = "015_b7_appt_ingredients"
branch_labels = None
depends_on = None


NEW_AUDIT_EVENT_TYPES = (
    # OAuth links
    "oauth_link_added",
    "oauth_link_removed",
    "oauth_link_rejected_conflict",
    # Prescription assets
    "prescription_asset_uploaded",
    "prescription_asset_downloaded",
    "prescription_asset_deleted",
    # Data export
    "data_export_requested",
    "data_export_downloaded",
    # Account deletion lifecycle
    "account_deletion_requested",
    "account_deletion_cancelled",
    "account_purged",
    # PDF report export
    "report_pdf_requested",
    "report_pdf_downloaded",
)


def upgrade() -> None:
    # Extend audit_event_type_enum (one ALTER TYPE per value, autocommit block).
    with op.get_context().autocommit_block():
        for value in NEW_AUDIT_EVENT_TYPES:
            op.execute(
                f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{value}'"
            )

    op.create_table(
        "oauth_accounts",
        sa.Column("id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("provider_account_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider", "provider_account_id", name="uq_oauth_provider_account"
        ),
    )
    op.create_index("ix_oauth_accounts_user_id", "oauth_accounts", ["user_id"])
    op.create_index("ix_oauth_accounts_provider", "oauth_accounts", ["provider"])
    # NOTE: No automatic backfill for legacy OAuth users. Their `users` rows
    # never recorded the original `provider_account_id`, so we cannot synthesise
    # a link without potentially mis-attributing a different Google/GitHub
    # account. Such users will get an `oauth_accounts` row created automatically
    # on their next OAuth sign-in (the refactored
    # `services/auth.get_or_create_user_from_oauth` upserts the row).


def downgrade() -> None:
    op.drop_index("ix_oauth_accounts_provider", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_user_id", table_name="oauth_accounts")
    op.drop_table("oauth_accounts")
    # Audit enum values are not removed — Postgres enum value removal would
    # require a full type recreation. Recovery is forward-only.

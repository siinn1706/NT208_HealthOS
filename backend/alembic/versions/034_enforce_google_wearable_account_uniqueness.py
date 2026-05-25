"""Enforce global uniqueness for Google wearable accounts.

Revision ID: 034_enforce_google_wearable_account_uniqueness
Revises: 033_harden_wearable_ingest_identity
Create Date: 2026-05-24

Historically the schema only guaranteed uniqueness within
``(user_id, provider, external_account_id)``. That allowed the same
Google account subject to be linked to multiple HealthOS users, which
made webhook routing ambiguous and broke tenant isolation.

Before adding the global partial unique index, we demote losing rows in
duplicate groups. The most recently connected row wins; older rows are
cleared and forced through a re-link flow.
"""
from __future__ import annotations

from typing import Union

from alembic import op


revision: str = "034_enforce_google_wearable_account_uniqueness"
down_revision: Union[str, None] = "033_harden_wearable_ingest_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY provider, external_account_id
                    ORDER BY connected_at DESC NULLS LAST, id DESC
                ) AS rn
            FROM connected_devices
            WHERE provider = 'google_health'
              AND external_account_id IS NOT NULL
        ),
        dupes AS (
            SELECT id
            FROM ranked
            WHERE rn > 1
        )
        UPDATE connected_devices AS cd
        SET
            external_account_id = NULL,
            access_token_encrypted = NULL,
            refresh_token_encrypted = NULL,
            token_expires_at = NULL,
            oauth_scopes = NULL,
            webhook_subscription_id = NULL,
            last_sync_status = 'error',
            last_sync_error = 'DUPLICATE_GOOGLE_ACCOUNT_RELINK_REQUIRED'
        FROM dupes
        WHERE cd.id = dupes.id
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_connected_devices_google_account_global
            ON connected_devices (provider, external_account_id)
            WHERE provider = 'google_health' AND external_account_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_connected_devices_google_account_global")

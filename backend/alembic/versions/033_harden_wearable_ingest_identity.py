"""Backfill canonical Health Connect external ids.

Revision ID: 033_harden_wearable_ingest_identity
Revises: 032_wearable_oauth_audit_events
Create Date: 2026-05-24

Health Connect ingest now namespaces dedupe keys by the server-side
device id (`hc:{device_id}:{external_id}`) before they reach
`health_metrics.external_id`. This migration backfills existing rows so
future updates and tombstones continue to hit the same records.

Rows whose originating device has already been deleted (`device_id IS
NULL`) are rewritten with a stable per-row orphan namespace so the
unique index cannot collide during migration. Those rows remain visible
as historical data but will no longer participate in live sync updates.
"""
from __future__ import annotations

from typing import Union

from alembic import op


revision: str = "033_harden_wearable_ingest_identity"
down_revision: Union[str, None] = "032_wearable_oauth_audit_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE health_metrics
        SET external_id = CASE
            WHEN device_id IS NOT NULL THEN
                'hc:' || device_id::text || ':' || external_id
            ELSE
                'hc:orphan:' || id::text || ':' || external_id
        END
        WHERE source = 'health_connect'
          AND external_id IS NOT NULL
          AND external_id NOT LIKE 'hc:%'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE health_metrics
        SET external_id = regexp_replace(
            external_id,
            '^hc:(?:orphan:[0-9a-fA-F-]+|[0-9a-fA-F-]+):',
            ''
        )
        WHERE source = 'health_connect'
          AND external_id LIKE 'hc:%'
        """
    )

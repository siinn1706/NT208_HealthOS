"""Add wearable_oauth_* values to audit_event_type_enum.

Revision ID: 032_wearable_oauth_audit_events
Revises: 030_wearables_metrics_and_oauth
Create Date: 2026-05-24

Two new audit event values, mirroring the existing ``HEALTH_CONNECT_*``
pair but specific to the server-side OAuth wearable flow (Luồng B —
Google Health). We can't reuse the HEALTH_CONNECT events because they
carry semantic meaning ("the user toggled a permission inside the
Health Connect app") that doesn't apply when tokens live on our server.

Targets ``audit_event_type_enum`` (the canonical name set in
``backend/app/models/audit.py`` line 106), not the legacy generated enum
type name used by a sibling migration on a different stream.
"""
from __future__ import annotations

from typing import Union

from alembic import op


revision: str = "032_wearable_oauth_audit_events"
down_revision: Union[str, None] = "030_wearables_metrics_and_oauth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL ALTER TYPE ... ADD VALUE cannot run inside a transaction
    # block on PG <= 11. autocommit_block() is the canonical workaround
    # and matches the dance migration 024 uses for the same enum.
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE audit_event_type_enum "
            "ADD VALUE IF NOT EXISTS 'wearable_oauth_connected'"
        )
        op.execute(
            "ALTER TYPE audit_event_type_enum "
            "ADD VALUE IF NOT EXISTS 'wearable_oauth_disconnected'"
        )


def downgrade() -> None:
    # PostgreSQL has no DROP VALUE for enums; downgrade is a no-op so
    # the previously-added values remain harmless. Mirrors the pattern
    # used in 024_health_connect_sync and 031_add_security_access_denied_enum.
    pass

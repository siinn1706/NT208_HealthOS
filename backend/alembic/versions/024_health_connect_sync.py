"""Health Connect sync — add provider, source metadata, dedupe key, sync state.

Revision ID: 024_health_connect_sync
Revises: 023_b7_users_has_password_and_token_invalidation
Create Date: 2026-04-19

Schema diff for the Real Android Health Connect Sync feature:

  * Adds `health_connect` to `wearable_provider_enum` and `wearable_source_enum`
    so we can attribute records that came from the Android Health Connect
    platform (distinct from Google Fit, which is being deprecated).

  * Extends `connected_devices` with the per-installation metadata we need to
    drive the mobile sync orchestrator — the `package` of the source app,
    a user-facing label, the granted record-type scopes, and the result of
    the most recent sync run (status / count / short error string).

  * Extends `health_metrics` with the dedupe + provenance columns:
      - `external_id` + `external_version` are the Health Connect identity
        tuple. The partial unique index on (user_id, source, external_id)
        WHERE external_id IS NOT NULL is the dedupe key the upsert relies on.
      - `device_id` FK ties a synced row back to the `connected_devices` row
        that produced it. ON DELETE SET NULL keeps history visible after a
        user disconnects.
      - `source_app` / `recording_method` come straight from HC metadata so
        the UI can render "Synced from Samsung Health" pills.
      - `is_deleted` + `deleted_at` are flipped when HC reports a deletion in
        getChanges; we keep the row for audit + so it can resurrect on undo.

  * Creates `device_sync_state` — one row per (device, record_type) holding
    the opaque HC `changesToken`. We keep this server-side (not on device) so
    a reinstall does not lose history and so two Android devices on one user
    can share one logical sync state per record type.

All changes are additive; downgrade drops the new objects in reverse order.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "024_health_connect_sync"
down_revision: Union[str, None] = "023_b7_users_has_password_and_token_invalidation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enum additions ────────────────────────────────────────────────────
    # PostgreSQL ALTER TYPE ... ADD VALUE cannot run inside a transaction
    # block on older versions; alembic by default wraps migrations in a
    # transaction. Using `op.execute` with the IF NOT EXISTS form keeps the
    # migration idempotent and safe to re-run.
    op.execute("ALTER TYPE wearable_provider_enum ADD VALUE IF NOT EXISTS 'health_connect'")
    op.execute("ALTER TYPE wearable_source_enum ADD VALUE IF NOT EXISTS 'health_connect'")

    # ── connected_devices: per-installation metadata ──────────────────────
    op.add_column(
        "connected_devices",
        sa.Column("external_account_id", sa.String(128), nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column("device_label", sa.String(128), nullable=True),
    )
    op.execute(
        "ALTER TABLE connected_devices ADD COLUMN IF NOT EXISTS scopes JSONB"
    )
    op.add_column(
        "connected_devices",
        sa.Column("last_sync_status", sa.String(32), nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column("last_sync_error", sa.Text, nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column("last_sync_count", sa.Integer, nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column(
            "last_attempted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # One device row per (user, provider, source app). external_account_id
    # is nullable so legacy rows (Apple Health / Garmin / Fitbit stubs) do
    # not violate the constraint — PostgreSQL treats NULLs as distinct in
    # a UNIQUE index by default.
    op.create_unique_constraint(
        "uq_connected_devices_user_provider_account",
        "connected_devices",
        ["user_id", "provider", "external_account_id"],
    )

    # ── health_metrics: dedupe + provenance ───────────────────────────────
    op.add_column(
        "health_metrics",
        sa.Column("external_id", sa.String(128), nullable=True),
    )
    op.add_column(
        "health_metrics",
        sa.Column("external_version", sa.BigInteger, nullable=True),
    )
    op.add_column(
        "health_metrics",
        sa.Column(
            "device_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("connected_devices.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "health_metrics",
        sa.Column("source_app", sa.String(128), nullable=True),
    )
    op.add_column(
        "health_metrics",
        sa.Column("recording_method", sa.String(16), nullable=True),
    )
    op.add_column(
        "health_metrics",
        sa.Column(
            "is_deleted",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "health_metrics",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Partial unique index — the dedupe key. Manual rows have NULL
    # external_id and are exempt from the constraint.
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_health_metrics_external_id
            ON health_metrics (user_id, source, external_id)
            WHERE external_id IS NOT NULL
        """
    )
    # Lookup index for "show me everything synced from this device".
    op.create_index(
        "ix_health_metrics_device_id",
        "health_metrics",
        ["device_id"],
    )

    # ── device_sync_state ────────────────────────────────────────────────
    op.create_table(
        "device_sync_state",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "device_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("connected_devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("record_type", sa.String(64), nullable=False),
        sa.Column("changes_token", sa.Text, nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_attempted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "consecutive_failures",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "device_id", "record_type",
            name="uq_device_sync_state_device_record",
        ),
    )
    op.create_index(
        "ix_device_sync_state_device_id",
        "device_sync_state",
        ["device_id"],
    )

    # ── audit_event_type_enum: new HC-related events ─────────────────────
    # Same caveat as above — must use ADD VALUE IF NOT EXISTS one at a time.
    for value in (
        "health_data_sync_started",
        "health_data_sync_completed",
        "health_data_sync_failed",
        "health_connect_permission_granted",
        "health_connect_permission_revoked",
        "health_connect_disconnected",
    ):
        op.execute(
            f"ALTER TYPE audit_event_type_enum ADD VALUE IF NOT EXISTS '{value}'"
        )


def downgrade() -> None:
    op.drop_index("ix_device_sync_state_device_id", table_name="device_sync_state")
    op.drop_table("device_sync_state")

    op.drop_index("ix_health_metrics_device_id", table_name="health_metrics")
    op.execute("DROP INDEX IF EXISTS uq_health_metrics_external_id")
    op.drop_column("health_metrics", "deleted_at")
    op.drop_column("health_metrics", "is_deleted")
    op.drop_column("health_metrics", "recording_method")
    op.drop_column("health_metrics", "source_app")
    op.drop_column("health_metrics", "device_id")
    op.drop_column("health_metrics", "external_version")
    op.drop_column("health_metrics", "external_id")

    op.drop_constraint(
        "uq_connected_devices_user_provider_account",
        "connected_devices",
        type_="unique",
    )
    op.drop_column("connected_devices", "last_attempted_at")
    op.drop_column("connected_devices", "last_sync_count")
    op.drop_column("connected_devices", "last_sync_error")
    op.drop_column("connected_devices", "last_sync_status")
    op.drop_column("connected_devices", "scopes")
    op.drop_column("connected_devices", "device_label")
    op.drop_column("connected_devices", "external_account_id")

    # PostgreSQL has no DROP VALUE for enums — we leave the new enum values
    # in place on downgrade. This is the standard alembic + Postgres dance.

"""Wearables sync — extend metric_type_enum and add OAuth token columns.

Revision ID: 030_wearables_metrics_and_oauth
Revises: 029_merge_auth_and_ai_heads
Create Date: 2026-05-22

Two additive changes to support the Wearable Sync feature (Luồng A
Health Connect + Luồng B Google Health API):

  * Extends ``metric_type_enum`` from the original 6 values
    (heart_rate, steps, sleep_minutes, weight_kg, blood_pressure_*) to
    the full set of ~36 metrics the wearable normalizer can produce.
    Each new value corresponds 1:1 to a Health Connect record type or
    a Google Health API data type — see
    ``backend/app/services/wearable_sync/normalizer.py`` for the
    canonical mapping.

  * Adds server-side OAuth columns to ``connected_devices`` for the new
    ``google_health`` provider. Tokens are stored Fernet-encrypted (the
    helper lives in ``services/wearable_sync/token_crypto.py``); the
    ``token_expires_at`` column lets the Celery sync task refresh
    proactively instead of waiting for a 401. ``oauth_scopes`` mirrors
    the granted-scope list the OAuth server returns so we can detect
    re-consent flows. ``webhook_subscription_id`` is populated only when
    Google Health supports push notifications for the connected account.

All changes are additive; downgrade drops the new columns but PostgreSQL
has no DROP VALUE for enums so the added metric_type values stay in
place after downgrade (the same dance as migration 024).
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = "030_wearables_metrics_and_oauth"
down_revision: Union[str, None] = "029_merge_auth_and_ai_heads"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# New metric_type_enum values. Listed in the order they appear in the spec
# (cardio → respiratory → activity → sleep → body composition → temp → misc)
# so the migration file reads as a checklist against the wearable spec.
# ---------------------------------------------------------------------------
_NEW_METRIC_TYPES: tuple[str, ...] = (
    # Cardiovascular
    "heart_rate_resting",
    "heart_rate_max",
    "hrv_rmssd",
    # Respiratory
    "spo2",
    "respiratory_rate",
    "vo2_max",
    # Activity
    "distance_m",
    "calories_active",
    "calories_total",
    "floors_climbed",
    "active_minutes",
    "exercise_session_minutes",
    # Sleep stages (sleep_minutes is the legacy total — these are the breakdown)
    "sleep_light",
    "sleep_deep",
    "sleep_rem",
    "sleep_awake",
    "sleep_efficiency",
    # Body composition
    "body_fat_percentage",
    "lean_body_mass",
    "bone_mass",
    "body_water",
    "bmi",
    "height_cm",
    # Temperature
    "body_temperature",
    "skin_temperature_delta",
    # Misc
    "blood_glucose",
    "hydration_ml",
    "stress_score",
    "menstrual_flow",
    "mindfulness_minutes",
)


def upgrade() -> None:
    # ── Enum additions ────────────────────────────────────────────────────
    # PostgreSQL `ALTER TYPE ... ADD VALUE` cannot run inside a transaction
    # block on older versions; alembic by default wraps each migration in a
    # transaction. `op.execute` with `IF NOT EXISTS` keeps this idempotent
    # so a partial re-run cannot fail with "value already exists" and so
    # the migration is safe to apply against a database that was hand-patched
    # via a parallel branch.
    for value in _NEW_METRIC_TYPES:
        op.execute(f"ALTER TYPE metric_type_enum ADD VALUE IF NOT EXISTS '{value}'")

    # Also register google_health as a wearable provider. Migration 024 added
    # health_connect; google_health is the server-side OAuth counterpart and
    # was not anticipated then. Source enum gets the same value so health
    # metrics ingested via the Celery sync task can be attributed correctly.
    op.execute("ALTER TYPE wearable_provider_enum ADD VALUE IF NOT EXISTS 'google_health'")
    op.execute("ALTER TYPE wearable_source_enum ADD VALUE IF NOT EXISTS 'google_health'")

    # ── connected_devices: OAuth token storage (Luồng B) ──────────────────
    # All columns nullable so existing health_connect rows (Luồng A, no
    # server-side tokens) and legacy stub rows are unaffected. Tokens are
    # stored Fernet-encrypted by the application layer; the DB just stores
    # opaque text.
    op.add_column(
        "connected_devices",
        sa.Column("access_token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "connected_devices",
        sa.Column(
            "token_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # JSONB mirror of the OAuth scopes the server granted. Distinct from the
    # existing `scopes` JSONB column on this table — that one stores Health
    # Connect record-type names like ["Steps","HeartRate","SleepSession"].
    # `oauth_scopes` stores Google Health scope URIs like
    # ["https://www.googleapis.com/auth/fitness.activity.read", ...].
    op.execute(
        "ALTER TABLE connected_devices ADD COLUMN IF NOT EXISTS oauth_scopes JSONB"
    )
    # Populated only if Google Health supports webhook subscriptions for the
    # connected account. Null when we fall back to Celery Beat polling.
    op.add_column(
        "connected_devices",
        sa.Column("webhook_subscription_id", sa.String(128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("connected_devices", "webhook_subscription_id")
    op.execute("ALTER TABLE connected_devices DROP COLUMN IF EXISTS oauth_scopes")
    op.drop_column("connected_devices", "token_expires_at")
    op.drop_column("connected_devices", "refresh_token_encrypted")
    op.drop_column("connected_devices", "access_token_encrypted")
    # PostgreSQL has no DROP VALUE for enums — the new metric_type_enum and
    # wearable_*_enum values stay in place on downgrade. This is the standard
    # alembic + Postgres dance and matches the downgrade in migration 024.

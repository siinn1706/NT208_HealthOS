"""init_auth_tables

Revision ID: 000
Revises:
Create Date: 2026-01-01 00:00:00.000000

Creates all core / auth domain tables (idempotent — safe to run on a DB
that already has some of these objects):
  - users, user_profiles, meals, health_metrics, connected_devices, notifications

And their PostgreSQL enum types:
  - gender_enum, meal_status_enum, metric_type_enum,
    wearable_source_enum, wearable_provider_enum
"""
from typing import Sequence, Union

from alembic import op

revision: str = "000"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types (idempotent) ────────────────────────────────────────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE meal_status_enum AS ENUM ('pending', 'processing', 'analyzed', 'failed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE metric_type_enum AS ENUM (
                'heart_rate', 'steps', 'sleep_minutes', 'weight_kg',
                'blood_pressure_systolic', 'blood_pressure_diastolic'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE wearable_source_enum AS ENUM (
                'manual', 'apple_health', 'google_fit', 'garmin', 'fitbit'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE wearable_provider_enum AS ENUM (
                'apple_health', 'google_fit', 'garmin', 'fitbit'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ── users ──────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id           UUID PRIMARY KEY,
            email        VARCHAR(255) NOT NULL,
            display_name VARCHAR(255) NOT NULL DEFAULT '',
            hashed_password VARCHAR(255) NOT NULL DEFAULT '',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_users_email UNIQUE (email)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);")

    # ── user_profiles ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id              UUID PRIMARY KEY,
            user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            full_name       VARCHAR(255) NOT NULL DEFAULT '',
            date_of_birth   DATE,
            gender          gender_enum,
            blood_type      VARCHAR(16),
            height_cm       FLOAT,
            weight_kg       FLOAT,
            phone           VARCHAR(32),
            address         VARCHAR(512),
            avatar_url      VARCHAR(512),
            emergency_contacts JSONB,
            medical_info    JSONB
        );
    """)

    # ── meals ──────────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id          UUID PRIMARY KEY,
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name        VARCHAR(255) NOT NULL,
            status      meal_status_enum NOT NULL DEFAULT 'pending',
            nutrition_result JSONB,
            logged_at   TIMESTAMPTZ NOT NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_meals_user_id ON meals (user_id);")

    # ── health_metrics ─────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS health_metrics (
            id          UUID PRIMARY KEY,
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            metric_type metric_type_enum NOT NULL,
            value       FLOAT NOT NULL,
            unit        VARCHAR(32) NOT NULL,
            recorded_at TIMESTAMPTZ NOT NULL,
            source      wearable_source_enum NOT NULL DEFAULT 'manual',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_health_metrics_user_id ON health_metrics (user_id);")

    # ── connected_devices ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS connected_devices (
            id              UUID PRIMARY KEY,
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider        wearable_provider_enum NOT NULL,
            connected_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_synced_at  TIMESTAMPTZ
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_connected_devices_user_id ON connected_devices (user_id);")

    # ── notifications ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id          UUID PRIMARY KEY,
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title       VARCHAR(255) NOT NULL,
            body        VARCHAR(2000) NOT NULL,
            is_read     BOOLEAN NOT NULL DEFAULT false,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notifications")
    op.execute("DROP TABLE IF EXISTS connected_devices")
    op.execute("DROP TABLE IF EXISTS health_metrics")
    op.execute("DROP TABLE IF EXISTS meals")
    op.execute("DROP TABLE IF EXISTS user_profiles")
    op.execute("DROP TABLE IF EXISTS users")

    op.execute("DROP TYPE IF EXISTS wearable_provider_enum")
    op.execute("DROP TYPE IF EXISTS wearable_source_enum")
    op.execute("DROP TYPE IF EXISTS metric_type_enum")
    op.execute("DROP TYPE IF EXISTS meal_status_enum")
    op.execute("DROP TYPE IF EXISTS gender_enum")

"""add_appointments_and_reminders

Revision ID: 006
Revises: 005
Create Date: 2026-03-17 00:00:00.000000

Adds DB-backed entities used by dashboard pages:
  - appointments
  - reminders
"""

from typing import Sequence, Union

from alembic import op


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE appointment_status_enum AS ENUM ('completed', 'upcoming', 'cancelled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE reminder_type_enum AS ENUM ('medicine', 'appointment', 'exercise');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE reminder_repeat_enum AS ENUM ('once', 'daily', 'weekly', 'monthly');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id                UUID PRIMARY KEY,
            user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            appointment_date  TIMESTAMPTZ NOT NULL,
            doctor_name       VARCHAR(255) NOT NULL,
            specialty         VARCHAR(128),
            clinic            VARCHAR(255),
            diagnosis         VARCHAR(512),
            status            appointment_status_enum NOT NULL DEFAULT 'upcoming',
            notes             TEXT,
            prescription      JSONB,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_appointments_user_id ON appointments (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_appointments_date ON appointments (appointment_date);")

    op.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id          UUID PRIMARY KEY,
            user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type        reminder_type_enum NOT NULL,
            title       VARCHAR(255) NOT NULL,
            remind_time VARCHAR(16) NOT NULL,
            repeat      reminder_repeat_enum NOT NULL DEFAULT 'once',
            note        TEXT,
            done        BOOLEAN NOT NULL DEFAULT false,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_reminders_user_id ON reminders (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_reminders_done ON reminders (done);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_reminders_type ON reminders (type);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS reminders;")
    op.execute("DROP TABLE IF EXISTS appointments;")
    op.execute("DROP TYPE IF EXISTS reminder_repeat_enum;")
    op.execute("DROP TYPE IF EXISTS reminder_type_enum;")
    op.execute("DROP TYPE IF EXISTS appointment_status_enum;")

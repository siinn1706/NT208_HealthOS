"""B7 P6 — messages.status column for AI streaming lifecycle.

Revision ID: 019_b7_messages_status_column
Revises: 018_b7_reminders_v2
Create Date: 2026-04-19

`status` is a free string column (kept as `String(16)` rather than a Postgres
enum to avoid a future enum-extension migration when we add new states).
Defaults to `'completed'` so every legacy row reads as a final, non-streaming
message.
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_b7_messages_status_column"
down_revision: Union[str, None] = "018_b7_reminders_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column(
            "status",
            sa.String(16),
            nullable=False,
            server_default=sa.text("'completed'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("messages", "status")

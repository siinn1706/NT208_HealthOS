"""Add atomic message client idempotency constraint.

Revision ID: 040_message_client_message_id_unique
Revises: 039_conversation_deleted_at
Create Date: 2026-05-27
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "040_message_client_message_id_unique"
down_revision = "039_conversation_deleted_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    duplicates = conn.execute(
        sa.text(
            """
            SELECT conversation_id, client_message_id, COUNT(*) AS duplicate_count
            FROM messages
            WHERE client_message_id IS NOT NULL
            GROUP BY conversation_id, client_message_id
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC
            LIMIT 10
            """
        )
    ).mappings().all()
    if duplicates:
        sample = "; ".join(
            f"conversation_id={row['conversation_id']}, "
            f"client_message_id={row['client_message_id']}, "
            f"count={row['duplicate_count']}"
            for row in duplicates
        )
        raise RuntimeError(
            "Cannot create uq_messages_conversation_client_message_id because "
            "duplicate client_message_id rows already exist. Resolve duplicates "
            f"before migrating. Samples: {sample}"
        )

    op.create_index(
        "uq_messages_conversation_client_message_id",
        "messages",
        ["conversation_id", "client_message_id"],
        unique=True,
        postgresql_where=sa.text("client_message_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_messages_conversation_client_message_id",
        table_name="messages",
    )

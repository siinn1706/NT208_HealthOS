"""add_chat_tables

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000

Creates the following tables:
  - conversations
  - conversation_members
  - messages
  - message_receipts
  - message_reactions
  - pinned_messages

And two PostgreSQL enum types:
  - conversation_type_enum
  - message_content_type_enum
"""
from typing import Sequence, Union

from alembic import op

revision: str = "001"
down_revision: Union[str, None] = "000"  # depends on baseline auth tables
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types (idempotent) ────────────────────────────────────────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE conversation_type_enum AS ENUM ('direct', 'group', 'ai');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE message_content_type_enum AS ENUM ('text', 'image', 'file', 'audio', 'system');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ── conversations ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id          UUID PRIMARY KEY,
            type        conversation_type_enum NOT NULL DEFAULT 'direct',
            title       VARCHAR(255),
            avatar_url  VARCHAR(512),
            created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # ── conversation_members ───────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS conversation_members (
            id              UUID PRIMARY KEY,
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role            VARCHAR(32) NOT NULL DEFAULT 'member',
            is_accepted     BOOLEAN NOT NULL DEFAULT true,
            is_muted        BOOLEAN NOT NULL DEFAULT false,
            joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_read_at    TIMESTAMPTZ,
            CONSTRAINT uq_conv_member UNIQUE (conversation_id, user_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_conv_members_conversation_id ON conversation_members (conversation_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_conv_members_user_id ON conversation_members (user_id);")

    # ── messages ───────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id                UUID PRIMARY KEY,
            conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id         UUID REFERENCES users(id) ON DELETE SET NULL,
            client_message_id VARCHAR(128),
            content           TEXT NOT NULL DEFAULT '',
            content_type      message_content_type_enum NOT NULL DEFAULT 'text',
            attachments       JSONB,
            reply_to_id       UUID REFERENCES messages(id) ON DELETE SET NULL,
            is_recalled       BOOLEAN NOT NULL DEFAULT false,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            edited_at         TIMESTAMPTZ,
            deleted_at        TIMESTAMPTZ
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON messages (sender_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_created_at ON messages (created_at);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_messages_client_message_id ON messages (client_message_id);")

    # ── message_receipts ───────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS message_receipts (
            id           UUID PRIMARY KEY,
            message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            delivered_at TIMESTAMPTZ,
            read_at      TIMESTAMPTZ,
            CONSTRAINT uq_message_receipt UNIQUE (message_id, user_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_receipts_message_id ON message_receipts (message_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_receipts_user_id ON message_receipts (user_id);")

    # ── message_reactions ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS message_reactions (
            id         UUID PRIMARY KEY,
            message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            emoji      VARCHAR(64) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_message_reaction UNIQUE (message_id, user_id, emoji)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_message_reactions_message_id ON message_reactions (message_id);")

    # ── pinned_messages ────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS pinned_messages (
            id              UUID PRIMARY KEY,
            conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            pinned_by       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            pinned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_pinned_message UNIQUE (conversation_id, message_id)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_pinned_messages_conversation_id ON pinned_messages (conversation_id);")


def downgrade() -> None:
    op.drop_table("pinned_messages")
    op.drop_table("message_reactions")
    op.drop_table("message_receipts")
    op.drop_table("messages")
    op.drop_table("conversation_members")
    op.drop_table("conversations")

    op.execute("DROP TYPE IF EXISTS message_content_type_enum")
    op.execute("DROP TYPE IF EXISTS conversation_type_enum")

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

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ─────────────────────────────────────────────────────────
    conversation_type = postgresql.ENUM(
        "direct", "group", "ai",
        name="conversation_type_enum",
        create_type=False,
    )
    conversation_type.create(op.get_bind(), checkfirst=True)

    message_content_type = postgresql.ENUM(
        "text", "image", "file", "audio", "system",
        name="message_content_type_enum",
        create_type=False,
    )
    message_content_type.create(op.get_bind(), checkfirst=True)

    # ── conversations ──────────────────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "type",
            sa.Enum("direct", "group", "ai", name="conversation_type_enum"),
            nullable=False,
            server_default="direct",
        ),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ── conversation_members ───────────────────────────────────────────────
    op.create_table(
        "conversation_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(32), nullable=False, server_default="member"),
        sa.Column("is_accepted", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("is_muted", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("conversation_id", "user_id", name="uq_conv_member"),
    )
    op.create_index("ix_conv_members_conversation_id", "conversation_members", ["conversation_id"])
    op.create_index("ix_conv_members_user_id", "conversation_members", ["user_id"])

    # ── messages ───────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("client_message_id", sa.String(128), nullable=True),
        sa.Column("content", sa.Text, nullable=False, server_default=""),
        sa.Column(
            "content_type",
            sa.Enum("text", "image", "file", "audio", "system", name="message_content_type_enum"),
            nullable=False,
            server_default="text",
        ),
        sa.Column("attachments", postgresql.JSONB, nullable=True),
        sa.Column(
            "reply_to_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("is_recalled", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])
    op.create_index("ix_messages_client_message_id", "messages", ["client_message_id"])

    # ── message_receipts ───────────────────────────────────────────────────
    op.create_table(
        "message_receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("message_id", "user_id", name="uq_message_receipt"),
    )
    op.create_index("ix_message_receipts_message_id", "message_receipts", ["message_id"])
    op.create_index("ix_message_receipts_user_id", "message_receipts", ["user_id"])

    # ── message_reactions ──────────────────────────────────────────────────
    op.create_table(
        "message_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("emoji", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("message_id", "user_id", "emoji", name="uq_message_reaction"),
    )
    op.create_index("ix_message_reactions_message_id", "message_reactions", ["message_id"])

    # ── pinned_messages ────────────────────────────────────────────────────
    op.create_table(
        "pinned_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pinned_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pinned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("conversation_id", "message_id", name="uq_pinned_message"),
    )
    op.create_index("ix_pinned_messages_conversation_id", "pinned_messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_table("pinned_messages")
    op.drop_table("message_reactions")
    op.drop_table("message_receipts")
    op.drop_table("messages")
    op.drop_table("conversation_members")
    op.drop_table("conversations")

    op.execute("DROP TYPE IF EXISTS message_content_type_enum")
    op.execute("DROP TYPE IF EXISTS conversation_type_enum")

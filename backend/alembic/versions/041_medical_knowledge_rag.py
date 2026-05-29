"""Add curated medical knowledge RAG tables.

Revision ID: 041_medical_knowledge_rag
Revises: 040_message_client_message_id_unique
Create Date: 2026-05-28
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "041_medical_knowledge_rag"
down_revision = "040_message_client_message_id_unique"
branch_labels = None
depends_on = None


def _install_vector_extension_if_available() -> None:
    conn = op.get_bind()
    available = conn.execute(
        sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
    ).scalar()
    if available:
        savepoint = conn.begin_nested()
        try:
            conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception:
            savepoint.rollback()
        else:
            savepoint.commit()


def upgrade() -> None:
    _install_vector_extension_if_available()
    op.create_table(
        "medical_knowledge_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("organization", sa.String(128), nullable=False),
        sa.Column("source_url", sa.String(1000), nullable=False),
        sa.Column("source_type", sa.String(64), nullable=False),
        sa.Column("language", sa.String(8), nullable=False, server_default=sa.text("'en'")),
        sa.Column("topic", sa.String(64), nullable=False),
        sa.Column("evidence_level", sa.String(64), nullable=True),
        sa.Column("published_at", sa.Date(), nullable=True),
        sa.Column("reviewed_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("slug", name="uq_medical_knowledge_sources_slug"),
    )
    op.create_index("ix_medical_knowledge_sources_slug", "medical_knowledge_sources", ["slug"], unique=True)
    op.create_index(
        "ix_medical_knowledge_sources_topic_language",
        "medical_knowledge_sources",
        ["topic", "language"],
    )

    op.create_table(
        "medical_knowledge_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("language", sa.String(8), nullable=False, server_default=sa.text("'en'")),
        sa.Column("topic", sa.String(64), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("embedding", postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "embedding IS NULL OR array_length(embedding, 1) = 384",
            name="ck_medical_knowledge_chunks_embedding_dim",
        ),
        sa.ForeignKeyConstraint(
            ["source_id"],
            ["medical_knowledge_sources.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("content_hash", name="uq_medical_knowledge_chunks_content_hash"),
        sa.UniqueConstraint("source_id", "chunk_index", name="uq_medical_knowledge_chunks_source_index"),
    )
    op.create_index(
        "ix_medical_knowledge_chunks_content_hash",
        "medical_knowledge_chunks",
        ["content_hash"],
        unique=True,
    )
    op.create_index(
        "ix_medical_knowledge_chunks_source_index",
        "medical_knowledge_chunks",
        ["source_id", "chunk_index"],
    )
    op.create_index(
        "ix_medical_knowledge_chunks_topic_language",
        "medical_knowledge_chunks",
        ["topic", "language"],
    )
    op.execute(
        """
        CREATE INDEX ix_medical_knowledge_chunks_lexical
        ON medical_knowledge_chunks
        USING GIN (
            to_tsvector(
                'simple',
                coalesce(title, '') || ' ' || coalesce(topic, '') || ' ' || coalesce(content, '')
            )
        )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_medical_knowledge_chunks_lexical", table_name="medical_knowledge_chunks")
    op.drop_index("ix_medical_knowledge_chunks_topic_language", table_name="medical_knowledge_chunks")
    op.drop_index("ix_medical_knowledge_chunks_source_index", table_name="medical_knowledge_chunks")
    op.drop_index("ix_medical_knowledge_chunks_content_hash", table_name="medical_knowledge_chunks")
    op.drop_table("medical_knowledge_chunks")
    op.drop_index("ix_medical_knowledge_sources_topic_language", table_name="medical_knowledge_sources")
    op.drop_index("ix_medical_knowledge_sources_slug", table_name="medical_knowledge_sources")
    op.drop_table("medical_knowledge_sources")

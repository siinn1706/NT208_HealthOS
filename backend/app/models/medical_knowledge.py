from __future__ import annotations

import datetime
import uuid
from typing import Any

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.core import Base


class MedicalKnowledgeSource(Base):
    __tablename__ = "medical_knowledge_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[str] = mapped_column(String(128), nullable=False)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str] = mapped_column(String(8), nullable=False, server_default=text("'en'"))
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    published_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    reviewed_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    chunks: Mapped[list["MedicalKnowledgeChunk"]] = relationship(
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="MedicalKnowledgeChunk.chunk_index",
    )

    __table_args__ = (
        Index("ix_medical_knowledge_sources_topic_language", "topic", "language"),
    )


class MedicalKnowledgeChunk(Base):
    __tablename__ = "medical_knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_knowledge_sources.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    language: Mapped[str] = mapped_column(String(8), nullable=False, server_default=text("'en'"))
    topic: Mapped[str] = mapped_column(String(64), nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'[]'::jsonb"),
    )
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    source: Mapped[MedicalKnowledgeSource] = relationship(back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("source_id", "chunk_index", name="uq_medical_knowledge_chunks_source_index"),
        Index("ix_medical_knowledge_chunks_source_index", "source_id", "chunk_index"),
        Index("ix_medical_knowledge_chunks_topic_language", "topic", "language"),
    )


__all__ = ["MedicalKnowledgeSource", "MedicalKnowledgeChunk"]

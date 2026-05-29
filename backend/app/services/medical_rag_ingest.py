from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Awaitable, Callable

import httpx
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.medical_knowledge import MedicalKnowledgeChunk, MedicalKnowledgeSource
from app.services.medical_rag_corpus import (
    MANIFEST_PATH,
    MedicalKnowledgeChunkInput,
    load_manifest,
    load_source_chunks,
)

EMBED_BATCH_SIZE = 16
EMBEDDING_DIMENSION = 384

Embedder = Callable[[list[str]], Awaitable[list[list[float]]]]


@dataclass(slots=True)
class MedicalRagIngestStats:
    sources_inserted: int = 0
    sources_updated: int = 0
    chunks_inserted: int = 0
    chunks_skipped: int = 0
    stale_chunks_removed: int = 0


def _parse_date(value: object) -> date | None:
    if not value:
        return None
    if not isinstance(value, str):
        raise ValueError("date fields must be ISO strings")
    return date.fromisoformat(value)


async def embed_texts_via_worker(texts: list[str]) -> list[list[float]]:
    url = f"{settings.ai_worker_url.rstrip('/')}/api/ai/embed"
    timeout = httpx.Timeout(settings.ai_worker_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json={"texts": texts})
        response.raise_for_status()
        body = response.json()
    embeddings = body.get("embeddings")
    if not isinstance(embeddings, list) or len(embeddings) != len(texts):
        raise RuntimeError("AI Worker returned an invalid embedding payload")
    for vector in embeddings:
        if not isinstance(vector, list) or len(vector) != EMBEDDING_DIMENSION:
            raise RuntimeError("AI Worker returned an unexpected embedding dimension")
    return [[float(value) for value in vector] for vector in embeddings]


async def _embed_chunks(chunks: list[MedicalKnowledgeChunkInput], embedder: Embedder) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start:start + EMBED_BATCH_SIZE]
        vectors.extend(await embedder([chunk.content for chunk in batch]))
    return vectors


async def ingest_medical_knowledge(
    db: AsyncSession,
    *,
    manifest_path: Path = MANIFEST_PATH,
    embedder: Embedder = embed_texts_via_worker,
) -> MedicalRagIngestStats:
    stats = MedicalRagIngestStats()
    for row in load_manifest(manifest_path):
        source_id = await _upsert_source(db, row, stats)
        chunks = load_source_chunks(row, corpus_dir=manifest_path.parent)
        vectors = await _embed_chunks(chunks, embedder)
        await _upsert_chunks(db, row, source_id, chunks, vectors, stats)
    await db.flush()
    return stats


async def _upsert_source(db: AsyncSession, row: dict[str, Any], stats: MedicalRagIngestStats) -> uuid.UUID:
    existing_id = (
        await db.execute(select(MedicalKnowledgeSource.id).where(MedicalKnowledgeSource.slug == row["slug"]))
    ).scalar_one_or_none()
    if existing_id is None:
        stats.sources_inserted += 1
    else:
        stats.sources_updated += 1

    stmt = pg_insert(MedicalKnowledgeSource).values(
        id=existing_id or uuid.uuid4(),
        slug=row["slug"],
        title=row["title"],
        organization=row["organization"],
        source_url=row["source_url"],
        source_type=row["source_type"],
        language=row["language"],
        topic=row["topic"],
        evidence_level=row.get("evidence_level"),
        published_at=_parse_date(row.get("published_at")),
        reviewed_at=_parse_date(row.get("reviewed_at")),
    )
    result = await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["slug"],
            set_={
                "title": stmt.excluded.title,
                "organization": stmt.excluded.organization,
                "source_url": stmt.excluded.source_url,
                "source_type": stmt.excluded.source_type,
                "language": stmt.excluded.language,
                "topic": stmt.excluded.topic,
                "evidence_level": stmt.excluded.evidence_level,
                "published_at": stmt.excluded.published_at,
                "reviewed_at": stmt.excluded.reviewed_at,
                "updated_at": func.now(),
            },
        ).returning(MedicalKnowledgeSource.id)
    )
    return result.scalar_one()


async def _upsert_chunks(
    db: AsyncSession,
    row: dict[str, Any],
    source_id: uuid.UUID,
    chunks: list[MedicalKnowledgeChunkInput],
    vectors: list[list[float]],
    stats: MedicalRagIngestStats,
) -> None:
    existing_hashes = set(
        (
            await db.execute(
                select(MedicalKnowledgeChunk.content_hash).where(
                    MedicalKnowledgeChunk.source_id == source_id
                )
            )
        ).scalars().all()
    )
    rows = []
    tags = list(row.get("tags") or [])
    for chunk, vector in zip(chunks, vectors, strict=True):
        if chunk.content_hash in existing_hashes:
            stats.chunks_skipped += 1
        else:
            stats.chunks_inserted += 1
        rows.append(
            {
                "id": uuid.uuid4(),
                "source_id": source_id,
                "chunk_index": chunk.chunk_index,
                "title": chunk.title,
                "content": chunk.content,
                "content_hash": chunk.content_hash,
                "language": row["language"],
                "topic": row["topic"],
                "tags": tags,
                "embedding": vector,
                "token_count": chunk.token_count,
            }
        )
    stmt = pg_insert(MedicalKnowledgeChunk).values(rows)
    await db.execute(
        stmt.on_conflict_do_update(
            index_elements=["content_hash"],
            set_={
                "source_id": stmt.excluded.source_id,
                "chunk_index": stmt.excluded.chunk_index,
                "title": stmt.excluded.title,
                "content": stmt.excluded.content,
                "language": stmt.excluded.language,
                "topic": stmt.excluded.topic,
                "tags": stmt.excluded.tags,
                "embedding": stmt.excluded.embedding,
                "token_count": stmt.excluded.token_count,
                "updated_at": func.now(),
            },
        )
    )
    keep_hashes = [chunk.content_hash for chunk in chunks]
    result = await db.execute(
        delete(MedicalKnowledgeChunk).where(
            MedicalKnowledgeChunk.source_id == source_id,
            MedicalKnowledgeChunk.content_hash.not_in(keep_hashes),
        )
    )
    stats.stale_chunks_removed += int(result.rowcount or 0)

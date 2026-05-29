from __future__ import annotations

import logging
import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.medical_knowledge import MedicalKnowledgeChunk
from app.services.medical_rag_ingest import EMBEDDING_DIMENSION, embed_texts_via_worker
from app.services.medical_safety import MedicalSafetyLevel, classify_by_rules

_LOGGER = logging.getLogger(__name__)
_HEALTH_RAG_LEVELS = {
    MedicalSafetyLevel.URGENT,
    MedicalSafetyLevel.ROUTINE,
    MedicalSafetyLevel.GENERAL,
}
_EXCERPT_CHARS = 420


@dataclass(frozen=True, slots=True)
class MedicalRagSource:
    id: str
    title: str
    organization: str
    url: str
    excerpt: str
    score: float


@dataclass(frozen=True, slots=True)
class MedicalRagResult:
    sources: list[MedicalRagSource]
    limited: bool = False
    reason: str | None = None


def is_health_related_query(text: str | None) -> bool:
    return classify_by_rules(text).level in _HEALTH_RAG_LEVELS


def rag_result_to_payload(result: MedicalRagResult) -> dict[str, Any]:
    sources = []
    for source in result.sources:
        sources.append({
            "id": source.id,
            "title": source.title,
            "organization": source.organization,
            "url": source.url,
            "excerpt": source.excerpt,
            "score": round(source.score, 4),
        })
    return {"sources": sources, "limited": result.limited, "reason": result.reason}


async def retrieve_medical_context(
    db: AsyncSession,
    query: str,
    locale: str,
    top_k: int | None = None,
) -> MedicalRagResult:
    if not settings.medical_rag_enabled:
        return MedicalRagResult([], limited=True, reason="disabled")
    if not is_health_related_query(query):
        return MedicalRagResult([], limited=False, reason="non_health")

    try:
        query_embedding = await _embed_query(query)
    except Exception as exc:  # noqa: BLE001 - retrieval degrades, chat continues
        _LOGGER.info("medical_rag.query_embedding_failed reason=%s", exc)
        query_embedding = None

    try:
        candidates = await _fetch_candidate_chunks(db)
        sources = _rank_candidate_chunks(
            candidates,
            query=query,
            query_embedding=query_embedding,
            locale=locale,
            top_k=top_k or settings.medical_rag_top_k,
        )
    except Exception as exc:  # noqa: BLE001 - retrieval must not break chat
        _LOGGER.warning("medical_rag.retrieve_failed reason=%s", exc)
        return MedicalRagResult([], limited=True, reason="retrieval_failed")

    if not sources:
        return MedicalRagResult([], limited=True, reason="no_sources")
    return MedicalRagResult(sources, limited=False, reason=None)


async def _embed_query(query: str) -> list[float]:
    vectors = await embed_texts_via_worker([query])
    vector = vectors[0]
    if len(vector) != EMBEDDING_DIMENSION:
        raise RuntimeError("query embedding dimension mismatch")
    return vector


async def _fetch_candidate_chunks(db: AsyncSession) -> list[MedicalKnowledgeChunk]:
    result = await db.execute(
        select(MedicalKnowledgeChunk)
        .options(selectinload(MedicalKnowledgeChunk.source))
        .order_by(MedicalKnowledgeChunk.updated_at.desc())
        .limit(settings.medical_rag_candidate_limit)
    )
    return list(result.scalars().all())


def _normalize(value: object) -> str:
    if not isinstance(value, str):
        return ""
    value = value.replace("đ", "d").replace("Đ", "d")
    decomposed = unicodedata.normalize("NFD", value)
    without_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).strip()


def _tokens(value: str) -> set[str]:
    return {token for token in _normalize(value).split() if len(token) >= 3}


def _cosine(a: list[float] | None, b: list[float] | None) -> float | None:
    if not a or not b or len(a) != len(b):
        return None
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a <= 0 or norm_b <= 0:
        return None
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def _language_boost(chunk_language: str, locale: str) -> float:
    preferred = "en" if (locale or "").lower().startswith("en") else "vi"
    language = (chunk_language or "").lower()
    if language == preferred:
        return 0.15
    return 0.08 if language == "en" else 0.0


def _lexical_score(chunk: Any, query: str) -> float:
    terms = _tokens(query)
    if not terms:
        return 0.0
    tags = " ".join(str(tag) for tag in (getattr(chunk, "tags", None) or []))
    title_topic_tags = _normalize(f"{getattr(chunk, 'title', '')} {getattr(chunk, 'topic', '')} {tags}")
    content = _normalize(getattr(chunk, "content", ""))
    score = 0.0
    for term in terms:
        if term in title_topic_tags:
            score += 2.0
        if term in content:
            score += 1.0
    return min(1.0, score / max(4.0, len(terms) * 2.0))


def _excerpt(content: str, query: str) -> str:
    text = " ".join(str(content).split())
    if len(text) <= _EXCERPT_CHARS:
        return text
    normalized_text = _normalize(text)
    positions = [normalized_text.find(term) for term in _tokens(query) if normalized_text.find(term) >= 0]
    start = max(0, min(positions) - 120) if positions else 0
    return text[start:start + _EXCERPT_CHARS].strip()


def _rank_candidate_chunks(
    chunks: list[Any],
    *,
    query: str,
    query_embedding: list[float] | None,
    locale: str,
    top_k: int,
) -> list[MedicalRagSource]:
    scored: list[tuple[float, Any]] = []
    for chunk in chunks:
        lexical = _lexical_score(chunk, query)
        vector = _cosine(query_embedding, getattr(chunk, "embedding", None))
        if lexical <= 0 and vector is None:
            continue
        score = (vector or 0.0) * 0.65 + lexical * 0.35
        score += _language_boost(getattr(chunk, "language", ""), locale)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    sources: list[MedicalRagSource] = []
    for index, (score, chunk) in enumerate(scored[:top_k], start=1):
        source = getattr(chunk, "source", None)
        sources.append(
            MedicalRagSource(
                id=f"S{index}",
                title=getattr(source, "title", None) or getattr(chunk, "title", ""),
                organization=getattr(source, "organization", "") or "",
                url=getattr(source, "source_url", "") or "",
                excerpt=_excerpt(getattr(chunk, "content", ""), query),
                score=score,
            )
        )
    return sources

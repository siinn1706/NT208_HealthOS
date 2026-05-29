from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import medical_rag


def _chunk(
    *,
    title: str,
    content: str,
    topic: str,
    tags: list[str],
    organization: str = "Test Org",
    url: str = "https://example.test/source",
):
    return SimpleNamespace(
        title=title,
        content=content,
        topic=topic,
        tags=tags,
        language="en",
        embedding=None,
        source=SimpleNamespace(title=title, organization=organization, source_url=url),
    )


def test_is_health_related_query_excludes_emergency_and_non_health():
    assert medical_rag.is_health_related_query("How can I sleep better?") is True
    assert medical_rag.is_health_related_query("Cân nặng này có ổn không?") is True
    assert medical_rag.is_health_related_query("BMI 17.4 có bị thiếu cân không?") is True
    assert medical_rag.is_health_related_query("What is the capital of France?") is False
    assert medical_rag.is_health_related_query("I have crushing chest pain") is False


@pytest.mark.asyncio
async def test_retrieve_non_health_skips_fetch_and_embedding(monkeypatch: pytest.MonkeyPatch):
    async def fail_embed(_query: str):
        raise AssertionError("non-health retrieval must not embed")

    async def fail_fetch(_db):
        raise AssertionError("non-health retrieval must not query chunks")

    monkeypatch.setattr(medical_rag, "_embed_query", fail_embed)
    monkeypatch.setattr(medical_rag, "_fetch_candidate_chunks", fail_fetch)

    result = await medical_rag.retrieve_medical_context(
        AsyncMock(),
        "What is the capital of France?",
        "en",
    )

    assert result.sources == []
    assert result.limited is False
    assert result.reason == "non_health"


@pytest.mark.asyncio
async def test_retrieve_uses_lexical_fallback_when_embedding_fails(monkeypatch: pytest.MonkeyPatch):
    async def fail_embed(_query: str):
        raise RuntimeError("worker down")

    async def fake_fetch(_db):
        return [
            _chunk(
                title="High blood pressure overview",
                topic="blood_pressure",
                tags=["blood pressure", "hypertension", "huyet ap"],
                content="High blood pressure can raise risk of heart disease and stroke.",
            ),
            _chunk(
                title="Healthy diet basics",
                topic="nutrition",
                tags=["diet", "nutrition"],
                content="A healthy diet emphasizes vegetables and whole grains.",
            ),
        ]

    monkeypatch.setattr(medical_rag, "_embed_query", fail_embed)
    monkeypatch.setattr(medical_rag, "_fetch_candidate_chunks", fake_fetch)

    result = await medical_rag.retrieve_medical_context(
        AsyncMock(),
        "Can exercise help blood pressure?",
        "vi",
    )

    assert result.limited is False
    assert result.sources
    assert result.sources[0].title == "High blood pressure overview"
    assert "blood pressure" in result.sources[0].excerpt.lower()


@pytest.mark.asyncio
async def test_retrieve_marks_limited_when_health_query_has_no_sources(monkeypatch: pytest.MonkeyPatch):
    async def fake_embed(_query: str):
        return [0.1] * 384

    async def fake_fetch(_db):
        return []

    monkeypatch.setattr(medical_rag, "_embed_query", fake_embed)
    monkeypatch.setattr(medical_rag, "_fetch_candidate_chunks", fake_fetch)

    result = await medical_rag.retrieve_medical_context(AsyncMock(), "How can I sleep better?", "en")

    assert result.sources == []
    assert result.limited is True
    assert result.reason == "no_sources"

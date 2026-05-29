"""Unit tests for local embedding generation."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import sys
import time
from types import ModuleType

import pytest

from app.core.config import settings
from app.services import embedding_service


@pytest.fixture(autouse=True)
def _reset_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(embedding_service, "_MODEL", None)
    monkeypatch.setattr(settings, "ai_embedding_dimension", 384, raising=False)
    monkeypatch.setattr(
        settings,
        "ai_embedding_model",
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        raising=False,
    )


def test_embed_texts_lazy_loads_and_reuses_model(monkeypatch: pytest.MonkeyPatch) -> None:
    loads: list[str] = []

    class FakeSentenceTransformer:
        def __init__(self, model_name: str) -> None:
            loads.append(model_name)

        def encode(self, texts: list[str], convert_to_numpy: bool = True) -> list[list[float]]:
            assert convert_to_numpy is True
            return [[0.25] * 384 for _ in texts]

    fake_module = ModuleType("sentence_transformers")
    fake_module.SentenceTransformer = FakeSentenceTransformer
    monkeypatch.setitem(sys.modules, "sentence_transformers", fake_module)

    first = embedding_service.embed_texts(["xin chào"])
    second = embedding_service.embed_texts(["huyết áp"])

    assert len(first[0]) == 384
    assert len(second[0]) == 384
    assert loads == ["sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]


def test_embed_texts_loads_model_once_for_concurrent_first_requests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    loads: list[str] = []

    class FakeSentenceTransformer:
        def __init__(self, model_name: str) -> None:
            loads.append(model_name)
            time.sleep(0.02)

        def encode(self, texts: list[str], convert_to_numpy: bool = True) -> list[list[float]]:
            return [[0.25] * 384 for _ in texts]

    fake_module = ModuleType("sentence_transformers")
    fake_module.SentenceTransformer = FakeSentenceTransformer
    monkeypatch.setitem(sys.modules, "sentence_transformers", fake_module)

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(embedding_service.embed_texts, [["hello"]] * 4))

    assert all(len(result[0]) == 384 for result in results)
    assert loads == ["sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]


def test_embed_texts_rejects_empty_input() -> None:
    with pytest.raises(ValueError, match="at least one"):
        embedding_service.embed_texts([])


def test_embed_texts_rejects_blank_text() -> None:
    with pytest.raises(ValueError, match="non-blank"):
        embedding_service.embed_texts(["  "])


def test_embed_texts_checks_dimension(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeModel:
        def encode(self, texts: list[str], convert_to_numpy: bool = True) -> list[list[float]]:
            return [[0.1, 0.2]]

    monkeypatch.setattr(embedding_service, "_MODEL", FakeModel())

    with pytest.raises(RuntimeError, match="dimension mismatch"):
        embedding_service.embed_texts(["hello"])


def test_importing_main_does_not_load_embedding_model() -> None:
    import app.main  # noqa: F401

    assert embedding_service._MODEL is None

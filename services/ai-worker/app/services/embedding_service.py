"""Local embedding generation for future Medical RAG workflows."""
from __future__ import annotations

import threading
from typing import Any

from app.core.config import settings

_MODEL: Any | None = None
_MODEL_LOCK = threading.Lock()
_ENCODE_SEMAPHORE = threading.Semaphore(1)


def _get_model() -> Any:
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise RuntimeError("sentence-transformers is not installed.") from exc
        _MODEL = SentenceTransformer(settings.ai_embedding_model)
    return _MODEL


def _validate_texts(texts: list[str]) -> list[str]:
    if not texts:
        raise ValueError("texts must contain at least one item.")
    for text in texts:
        if not isinstance(text, str) or not text.strip():
            raise ValueError("texts must contain non-blank strings.")
    return texts


def _vector_to_float_list(vector: Any) -> list[float]:
    if hasattr(vector, "tolist"):
        vector = vector.tolist()
    return [float(value) for value in vector]


def embed_texts(texts: list[str]) -> list[list[float]]:
    validated_texts = _validate_texts(texts)
    model = _get_model()
    with _ENCODE_SEMAPHORE:
        vectors = model.encode(validated_texts, convert_to_numpy=True)
    embeddings = [_vector_to_float_list(vector) for vector in vectors]

    expected_dimension = int(settings.ai_embedding_dimension)
    for vector in embeddings:
        if len(vector) != expected_dimension:
            raise RuntimeError(
                f"Embedding dimension mismatch: expected {expected_dimension}, got {len(vector)}."
            )
    return embeddings

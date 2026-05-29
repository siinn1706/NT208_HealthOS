from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CORPUS_DIR = Path(__file__).resolve().parents[1] / "data" / "medical_knowledge"
MANIFEST_PATH = CORPUS_DIR / "manifest.json"
MAX_CHUNK_CHARS = 900


@dataclass(frozen=True, slots=True)
class MedicalKnowledgeChunkInput:
    chunk_index: int
    title: str
    content: str
    content_hash: str
    token_count: int


def load_manifest(path: Path = MANIFEST_PATH) -> list[dict[str, Any]]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise ValueError("medical knowledge manifest must be a non-empty list")
    return rows


def normalize_source_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def _estimate_tokens(text: str) -> int:
    return max(1, round(len(text) / 4))


def _split_section(heading: str, content: str) -> list[str]:
    normalized = normalize_source_text(content)
    if len(normalized) <= MAX_CHUNK_CHARS:
        return [normalized]
    paragraphs = [p.strip() for p in normalized.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= MAX_CHUNK_CHARS:
            current = candidate
            continue
        if current:
            chunks.append(current)
        current = paragraph[:MAX_CHUNK_CHARS]
    if current:
        chunks.append(current)
    return [
        f"{heading}: {chunk}" if heading and not chunk.startswith(heading) else chunk
        for chunk in chunks
    ]


def _content_hash(slug: str, content: str) -> str:
    normalized = normalize_source_text(content)
    return hashlib.sha256(f"{slug}\n{normalized}".encode("utf-8")).hexdigest()


def load_source_chunks(
    row: dict[str, Any],
    *,
    corpus_dir: Path = CORPUS_DIR,
) -> list[MedicalKnowledgeChunkInput]:
    slug = str(row["slug"])
    source_path = corpus_dir / str(row["body_path"])
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    sections = payload.get("sections")
    if not isinstance(sections, list) or not sections:
        raise ValueError(f"{source_path} must contain non-empty sections")

    chunks: list[MedicalKnowledgeChunkInput] = []
    for section in sections:
        heading = str(section.get("heading") or row["title"]).strip()
        content = str(section.get("content") or "").strip()
        if not content:
            continue
        for text in _split_section(heading, content):
            normalized = normalize_source_text(text)
            chunks.append(
                MedicalKnowledgeChunkInput(
                    chunk_index=len(chunks),
                    title=heading[:255],
                    content=normalized,
                    content_hash=_content_hash(slug, normalized),
                    token_count=_estimate_tokens(normalized),
                )
            )
    if not chunks:
        raise ValueError(f"{source_path} produced no chunks")
    return chunks

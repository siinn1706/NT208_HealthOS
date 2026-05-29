from __future__ import annotations

from app.services.medical_rag_corpus import MANIFEST_PATH, load_manifest, load_source_chunks


def test_medical_knowledge_manifest_has_expected_sources():
    rows = load_manifest()

    assert len(rows) == 6
    assert {row["organization"] for row in rows} == {
        "World Health Organization",
        "Centers for Disease Control and Prevention",
        "MedlinePlus",
    }
    assert all(row["source_url"].startswith("https://") for row in rows)
    assert all(row["language"] == "en" for row in rows)


def test_medical_knowledge_chunking_is_deterministic():
    row = next(row for row in load_manifest() if row["slug"] == "cdc-high-blood-pressure")

    chunks_a = load_source_chunks(row, corpus_dir=MANIFEST_PATH.parent)
    chunks_b = load_source_chunks(row, corpus_dir=MANIFEST_PATH.parent)

    assert chunks_a == chunks_b
    assert len(chunks_a) >= 3
    assert len({chunk.content_hash for chunk in chunks_a}) == len(chunks_a)
    assert all(chunk.token_count > 0 for chunk in chunks_a)
    assert any("blood pressure" in chunk.content.lower() for chunk in chunks_a)

"""Sanity tests for the seeded question_templates JSON (P1).

The actual DB seeding is exercised by Alembic; here we just verify the JSON
file shape so a typo or regression breaks before migrations run, not after.
"""
from __future__ import annotations

import json
from pathlib import Path

SEED = Path(__file__).resolve().parents[2] / "app" / "seeds" / "question_templates.json"

VALID_VISIT_TYPES = {
    "gp_routine",
    "specialist",
    "follow_up",
    "mental_health",
    "urgent_walkin",
    "pediatric_caregiver",
}
VALID_CATEGORIES = {
    "pain",
    "fever",
    "gi",
    "resp",
    "mental",
    "skin",
    "neuro",
    "cardio",
    "other",
}


def _load() -> list[dict]:
    return json.loads(SEED.read_text(encoding="utf-8"))


def test_seed_file_is_valid_json():
    rows = _load()
    assert isinstance(rows, list) and len(rows) > 0


def test_every_row_has_required_fields_and_bilingual_text():
    rows = _load()
    for row in rows:
        assert isinstance(row.get("slug"), str) and row["slug"], row
        assert isinstance(row.get("text_en"), str) and row["text_en"], row
        assert isinstance(row.get("text_vi"), str) and row["text_vi"], row
        assert "default_order" in row
        assert "is_canonical" in row
        vt = row.get("visit_type")
        if vt is not None:
            assert vt in VALID_VISIT_TYPES, f"Unknown visit_type {vt!r} in {row['slug']}"
        cat = row.get("concern_category")
        if cat is not None:
            assert cat in VALID_CATEGORIES, (
                f"Unknown concern_category {cat!r} in {row['slug']}"
            )


def test_slugs_are_unique():
    rows = _load()
    slugs = [r["slug"] for r in rows]
    assert len(slugs) == len(set(slugs)), "Duplicate slug in question_templates.json"


def test_exactly_four_canonical_questions():
    rows = _load()
    canonical = [r for r in rows if r.get("is_canonical")]
    assert len(canonical) == 4, (
        f"Expected exactly 4 canonical Healthwatch questions, got {len(canonical)}"
    )
    # Canonical rows must be universal (no visit_type or concern_category gating).
    for r in canonical:
        assert r.get("visit_type") is None
        assert r.get("concern_category") is None


def test_every_visit_type_has_at_least_one_template():
    rows = _load()
    seen_types = {r.get("visit_type") for r in rows if r.get("visit_type")}
    missing = VALID_VISIT_TYPES - seen_types
    assert not missing, f"Visit types with no template: {missing}"

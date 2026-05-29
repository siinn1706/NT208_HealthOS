"""Verifies that importing app.models registers every ORM-backed table on Base.metadata.

No live DB required — pure metadata assertion.
Fails fast if a new model file is added without being registered in app/models/__init__.py.
"""
from __future__ import annotations

import app.models  # noqa: F401 — side-effect: registers all mappers


def test_base_metadata_includes_all_non_device_tables():
    from app.models import Base

    expected = {
        "users",
        "user_profiles",
        "security_audit_logs",
        "emergency_profiles",
        "emergency_share_tokens",
        "emergency_access_logs",
        "visit_briefs",
        "symptom_entries",
        "triage_outcomes",
        "question_sets",
        "question_templates",
        "appointment_brief_links",
        "user_bmi_goals",
        "subscription_plans",
        "user_subscriptions",
        "medical_knowledge_sources",
        "medical_knowledge_chunks",
    }
    actual = set(Base.metadata.tables.keys())
    missing = expected - actual
    assert not missing, f"Missing tables in Base.metadata: {missing}"

"""Snapshot-style tests for ai_chat_context.

The tests focus on shape + privacy: we never want raw email/phone/full_name
to leak into the user_context dict that goes to the LLM.
"""
from __future__ import annotations

import datetime
import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import ai_chat_context


# ── build_system_prompt ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_build_system_prompt_default_locale_is_vietnamese():
    prompt = await ai_chat_context.build_system_prompt("vi")
    assert "HealthOS AI Assistant" in prompt
    assert "bác sĩ" in prompt.lower() or "tham khảo" in prompt.lower()
    assert "Trả lời đầy đủ" in prompt
    assert "chuỗi suy luận nội bộ" in prompt


@pytest.mark.asyncio
async def test_build_system_prompt_english():
    prompt = await ai_chat_context.build_system_prompt("en")
    assert "HealthOS AI Assistant" in prompt
    assert "doctor" in prompt.lower()
    assert "complete" in prompt.lower()
    assert "hidden chain-of-thought" in prompt


# ── _profile_snapshot ──────────────────────────────────────────────────────

def _make_user_with_profile(**profile_overrides) -> MagicMock:
    user = MagicMock()
    user.id = uuid.uuid4()
    profile = MagicMock()
    profile.date_of_birth = profile_overrides.get(
        "date_of_birth", datetime.date(1990, 1, 1)
    )
    profile.gender = MagicMock()
    profile.gender.value = profile_overrides.get("gender", "male")
    profile.height_cm = profile_overrides.get("height_cm", 170.0)
    profile.weight_kg = profile_overrides.get("weight_kg", 65.0)
    profile.blood_type = profile_overrides.get("blood_type", "O+")
    profile.medical_info = profile_overrides.get(
        "medical_info",
        {"chronic_conditions": ["asthma"], "allergies": ["peanuts"]},
    )
    user.profile = profile
    return user


def test_profile_snapshot_excludes_pii_keys():
    user = _make_user_with_profile()
    snap = ai_chat_context._profile_snapshot(user)
    serialised = json.dumps(snap, ensure_ascii=False)
    assert "email" not in serialised.lower()
    assert "phone" not in serialised.lower()
    assert "full_name" not in serialised.lower()
    assert "address" not in serialised.lower()
    assert snap["bmi"] == round(65 / (1.70 ** 2), 1)


def test_profile_snapshot_handles_missing_profile():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.profile = None
    snap = ai_chat_context._profile_snapshot(user)
    assert snap == {} or "bmi" not in snap


# ── _bmi helper ────────────────────────────────────────────────────────────

def test_bmi_returns_none_for_missing_inputs():
    assert ai_chat_context._bmi(None, 70) is None
    assert ai_chat_context._bmi(170, None) is None
    assert ai_chat_context._bmi(0, 70) is None


def test_bmi_rounds_to_one_decimal():
    assert ai_chat_context._bmi(170, 70) == 24.2


# ── _enforce_budget ────────────────────────────────────────────────────────

def test_enforce_budget_drops_optional_sections_when_too_large():
    big_payload = {
        "profile": {"x": "y"},
        "risk_summary": [{"a": "b" * 5000}],
        "recent_meals_3d": {"calories_total_3d": 1.0},
        "active_medicine_reminders": 1,
        "health_goals": None,
    }
    trimmed = ai_chat_context._enforce_budget(big_payload)
    serialised = json.dumps(trimmed, ensure_ascii=False)
    assert len(serialised) <= ai_chat_context._USER_CONTEXT_CHAR_BUDGET
    assert "profile" in trimmed


# ── build_user_context (integration with mocks) ────────────────────────────

@pytest.mark.asyncio
async def test_build_user_context_returns_complete_snapshot(monkeypatch):
    mock_db = AsyncMock()
    user = _make_user_with_profile()

    async def fake_vitals(db, user_id):
        return {"heart_rate_avg_bpm": 72.0, "samples_count": 5}

    async def fake_meals(db, user_id):
        return {"meals_logged_3d": 3, "calories_total_3d": 1500.0}

    async def fake_reminders(db, user_id):
        return 2

    async def fake_goals(db, user):
        return {"target_weight_kg": 60.0, "target_bmi": 20.8, "deadline": None}

    async def fake_risk(db, user):
        return [{"condition": "Hypertension", "level": "low", "probability": 0.18}]

    monkeypatch.setattr(ai_chat_context, "_vitals_7d", fake_vitals)
    monkeypatch.setattr(ai_chat_context, "_meals_3d", fake_meals)
    monkeypatch.setattr(ai_chat_context, "_active_medicine_reminders", fake_reminders)
    monkeypatch.setattr(ai_chat_context, "_health_goals", fake_goals)
    monkeypatch.setattr(ai_chat_context, "_risk_summary", fake_risk)

    snap = await ai_chat_context.build_user_context(mock_db, user)

    assert "profile" in snap
    assert snap["profile"]["bmi"] == round(65 / (1.70 ** 2), 1)
    assert snap["recent_vitals_7d"]["heart_rate_avg_bpm"] == 72.0
    assert snap["recent_meals_3d"]["meals_logged_3d"] == 3
    assert snap["active_medicine_reminders"] == 2
    assert snap["health_goals"]["target_weight_kg"] == 60.0
    assert snap["risk_summary"][0]["condition"] == "Hypertension"
    serialised = json.dumps(snap, ensure_ascii=False)
    assert len(serialised) <= ai_chat_context._USER_CONTEXT_CHAR_BUDGET

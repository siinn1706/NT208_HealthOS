from __future__ import annotations

import pytest

from app.services.medical_safety import (
    MedicalSafetyLevel,
    build_emergency_reply,
    classify_by_rules,
    detect_emergency_red_flags,
)


@pytest.mark.parametrize(
    ("message", "flag_id"),
    [
        ("I have crushing chest pain", "chest_pain_pressure"),
        ("I have shortness of breath at rest", "shortness_of_breath"),
        ("My tongue is swelling", "airway_swelling"),
        ("She passed out and is unconscious", "fainting_unconsciousness"),
        ("There is one-sided numbness in my arm", "one_sided_weakness_numbness"),
        ("I have sudden vision loss", "one_sided_weakness_numbness"),
        ("I suddenly can't see out of one eye", "one_sided_weakness_numbness"),
        ("His face has a facial droop", "facial_droop"),
        ("Sudden confusion and trouble speaking", "trouble_speaking_confusion"),
        ("My child is having a seizure", "seizure"),
        ("This is a sudden severe headache", "sudden_severe_headache"),
        ("I am vomiting blood", "vomiting_blood"),
        ("My stool is black stool and tarry", "black_stool"),
        ("The bleeding heavily and will not stop", "uncontrolled_bleeding"),
        ("I want to die and may hurt myself", "self_harm_intent"),
        ("I don't want to be alive anymore", "self_harm_intent"),
        ("Tôi bị đau ngực", "chest_pain_pressure"),
        ("Tôi khó thở nhiều", "shortness_of_breath"),
        ("Tôi bị sưng lưỡi", "airway_swelling"),
        ("Bệnh nhân bất tỉnh", "fainting_unconsciousness"),
        ("Tê một bên người", "one_sided_weakness_numbness"),
        ("Miệng bị méo miệng", "facial_droop"),
        ("Nói khó và lú lẫn", "trouble_speaking_confusion"),
        ("Đang co giật", "seizure"),
        ("Đau đầu dữ dội", "sudden_severe_headache"),
        ("Nôn ra máu", "vomiting_blood"),
        ("Đi ngoài phân đen", "black_stool"),
        ("Chảy máu không cầm", "uncontrolled_bleeding"),
        ("Tôi muốn chết", "self_harm_intent"),
        ("Tôi không muốn sống", "self_harm_intent"),
    ],
)
def test_detect_emergency_red_flags_returns_stable_ids(message: str, flag_id: str):
    assert flag_id in detect_emergency_red_flags(message)


def test_detect_emergency_red_flags_returns_registry_order_without_raw_text():
    flags = detect_emergency_red_flags(
        "Private note: {secret}. Crushing chest pain and I cannot breathe."
    )

    assert flags == ["chest_pain_pressure", "shortness_of_breath"]
    assert all("secret" not in flag for flag in flags)
    assert all("{" not in flag and "}" not in flag for flag in flags)


@pytest.mark.parametrize("value", ["", "   ", None, 123])
def test_detect_emergency_red_flags_handles_empty_or_non_string(value: object):
    assert detect_emergency_red_flags(value) == []


@pytest.mark.parametrize(
    "message",
    [
        "How can I sleep better?",
        "What is a healthy breakfast?",
        "Can I exercise after work?",
        "I did a chest workout today with no pain.",
        "I can't see my meal chart in the app.",
    ],
)
def test_classify_by_rules_avoids_emergency_false_positives(message: str):
    assert classify_by_rules(message).level is not MedicalSafetyLevel.EMERGENCY


def test_classify_by_rules_levels():
    assert classify_by_rules("I have chest pressure").level is MedicalSafetyLevel.EMERGENCY
    assert classify_by_rules("I have a high fever").level is MedicalSafetyLevel.URGENT
    assert classify_by_rules("Can I ask about blood pressure medication?").level is MedicalSafetyLevel.ROUTINE
    assert classify_by_rules("How can I sleep better?").level is MedicalSafetyLevel.GENERAL
    assert classify_by_rules("What is the capital of France?").level is MedicalSafetyLevel.NON_HEALTH


def test_build_emergency_reply_english_is_safe_and_templated():
    reply = build_emergency_reply("en", ["chest_pain_pressure"])

    assert "not emergency care" in reply
    assert "not a doctor" in reply
    assert "emergency number" in reply
    assert "emergency department" in reply
    assert "chest pain" not in reply.lower()
    assert "{" not in reply and "}" not in reply


def test_build_emergency_reply_vietnamese_self_harm_adds_crisis_wording():
    reply = build_emergency_reply("vi", ["self_harm_intent"])

    assert "không phải dịch vụ cấp cứu" in reply
    assert "không thay thế bác sĩ" in reply
    assert "gọi cấp cứu" in reply
    assert "khủng hoảng" in reply
    assert "{" not in reply and "}" not in reply

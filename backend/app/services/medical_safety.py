"""Deterministic first-pass medical safety checks for AI chat."""
from __future__ import annotations
import re
import unicodedata
from dataclasses import dataclass
from enum import Enum
class MedicalSafetyLevel(str, Enum):
    EMERGENCY = "emergency"
    URGENT = "urgent"
    ROUTINE = "routine"
    GENERAL = "general"
    NON_HEALTH = "non_health"

@dataclass(frozen=True, slots=True)
class MedicalSafetyResult:
    level: MedicalSafetyLevel
    matched_flags: tuple[str, ...] = ()
    reason: str | None = None

@dataclass(frozen=True, slots=True)
class _FlagPattern:
    flag_id: str
    phrases: tuple[str, ...]

_SELF_HARM_FLAG_ID = "self_harm_intent"
_EMERGENCY_FLAGS: tuple[_FlagPattern, ...] = (
    _FlagPattern(
        "chest_pain_pressure",
        (
            "chest pain", "chest pressure", "chest tightness", "crushing chest pain",
            "crushing pain in chest", "squeezing chest", "pain in my chest",
            "dau nguc", "tuc nguc", "nang nguc", "dau tuc nguc",
        ),
    ),
    _FlagPattern(
        "shortness_of_breath",
        (
            "shortness of breath", "short of breath", "cant breathe", "cannot breathe",
            "difficulty breathing", "trouble breathing", "hard to breathe",
            "gasping for air", "breathless", "kho tho", "hut hoi",
            "khong tho duoc", "ngop tho",
        ),
    ),
    _FlagPattern(
        "airway_swelling",
        (
            "throat swelling", "tongue swelling", "tongue is swelling",
            "throat is swelling", "swollen tongue", "swollen throat", "sung hong",
            "sung luoi",
        ),
    ),
    _FlagPattern(
        "fainting_unconsciousness",
        (
            "fainted", "fainting", "passed out", "lost consciousness", "unconscious",
            "blacked out", "ngat", "ngat xiu", "bat tinh", "mat y thuc",
        ),
    ),
    _FlagPattern(
        "one_sided_weakness_numbness",
        (
            "one sided weakness", "one sided numbness", "weakness on one side",
            "numbness on one side", "one side is weak", "one arm is weak",
            "sudden vision loss", "lost vision", "vision loss", "suddenly cant see",
            "cant see out of one eye", "cannot see out of one eye",
            "paralysis", "te mot ben", "yeu mot ben", "liet mot ben",
            "liet nua nguoi", "te liet", "liet",
        ),
    ),
    _FlagPattern(
        "facial_droop",
        (
            "facial droop", "face droop", "face drooping", "droopy face",
            "crooked smile", "one side of face", "meo mieng", "meo mat", "liet mat",
        ),
    ),
    _FlagPattern(
        "trouble_speaking_confusion",
        (
            "trouble speaking", "slurred speech", "cannot speak", "cant speak",
            "speech difficulty", "sudden confusion", "confused and disoriented",
            "noi kho", "noi lap", "khong noi duoc", "lu lan",
        ),
    ),
    _FlagPattern("seizure", ("seizure", "convulsion", "convulsing", "co giat", "dong kinh")),
    _FlagPattern(
        "sudden_severe_headache",
        (
            "sudden severe headache", "worst headache of my life", "worst headache ever",
            "thunderclap headache", "dau dau du doi", "dau dau kinh khung",
            "dau dau set danh",
        ),
    ),
    _FlagPattern(
        "vomiting_blood",
        ("vomiting blood", "vomit blood", "blood in vomit", "throwing up blood", "non ra mau"),
    ),
    _FlagPattern("black_stool", ("black stool", "black stools", "tarry stool", "phan den")),
    _FlagPattern(
        "uncontrolled_bleeding",
        ("uncontrolled bleeding", "wont stop bleeding", "bleeding heavily", "chay mau khong cam", "chay mau nhieu"),
    ),
    _FlagPattern(
        _SELF_HARM_FLAG_ID,
        (
            "suicidal", "suicide", "kill myself", "end my life", "want to die",
            "wish i was dead", "dont want to be alive", "do not want to be alive", "better off dead",
            "no reason to live", "cant go on", "self harm", "self harming",
            "hurt myself", "harm myself", "tu tu", "tu sat", "muon chet",
            "khong muon song", "khong con ly do de song", "muon tu tu",
            "tu lam hai", "lam hai ban than",
        ),
    ),
)
_URGENT_HEALTH_PHRASES = (
    "high fever", "severe pain", "worsening pain", "infection", "dehydrated",
    "blood pressure very high", "sot cao", "dau du doi", "nhiem trung",
)
_ROUTINE_HEALTH_PHRASES = (
    "doctor", "appointment", "medication", "medicine", "blood pressure", "glucose",
    "diabetes", "asthma", "headache", "stomach", "cough", "fever", "pain", "rash",
    "bmi", "body mass index", "underweight", "overweight", "weight loss", "weight gain",
    "healthy weight", "body weight", "bac si", "thuoc", "huyet ap", "duong huyet",
    "can nang", "chi so bmi", "thieu can", "du can", "tang can", "giam can",
    "dau", "ho", "sot",
)
_GENERAL_HEALTH_PHRASES = (
    "sleep", "nutrition", "diet", "exercise", "fitness", "wellness", "stress",
    "calories", "protein", "ngu", "dinh duong", "an uong", "tap luyen", "suc khoe",
)

def _normalize_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    decomposed = unicodedata.normalize("NFD", value)
    without_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    without_accents = without_accents.replace("đ", "d").replace("Đ", "d")
    without_accents = without_accents.lower().replace("'", "")
    without_accents = re.sub(r"[^a-z0-9]+", " ", without_accents)
    return " ".join(without_accents.split())

def _contains_phrase(normalized_text: str, phrase: str) -> bool:
    normalized_phrase = _normalize_text(phrase)
    return bool(normalized_phrase) and f" {normalized_phrase} " in f" {normalized_text} "

def _matches_any(normalized_text: str, phrases: tuple[str, ...]) -> bool:
    return any(_contains_phrase(normalized_text, phrase) for phrase in phrases)

def detect_emergency_red_flags(text: object) -> list[str]:
    """Return stable emergency flag ids in registry order."""
    normalized = _normalize_text(text)
    if not normalized:
        return []
    return [flag.flag_id for flag in _EMERGENCY_FLAGS if _matches_any(normalized, flag.phrases)]

def classify_by_rules(text: object) -> MedicalSafetyResult:
    normalized = _normalize_text(text)
    if not normalized:
        return MedicalSafetyResult(MedicalSafetyLevel.NON_HEALTH, reason="empty")
    emergency_flags = tuple(detect_emergency_red_flags(text))
    if emergency_flags:
        return MedicalSafetyResult(
            MedicalSafetyLevel.EMERGENCY,
            matched_flags=emergency_flags,
            reason="emergency_red_flag",
        )
    if _matches_any(normalized, _URGENT_HEALTH_PHRASES):
        return MedicalSafetyResult(MedicalSafetyLevel.URGENT, reason="urgent_health_terms")
    if _matches_any(normalized, _ROUTINE_HEALTH_PHRASES):
        return MedicalSafetyResult(MedicalSafetyLevel.ROUTINE, reason="routine_health_terms")
    if _matches_any(normalized, _GENERAL_HEALTH_PHRASES):
        return MedicalSafetyResult(MedicalSafetyLevel.GENERAL, reason="general_health_terms")
    return MedicalSafetyResult(MedicalSafetyLevel.NON_HEALTH, reason="no_health_terms")

def build_emergency_reply(locale: str, matched_flags: tuple[str, ...] | list[str]) -> str:
    is_self_harm = _SELF_HARM_FLAG_ID in set(matched_flags)
    if (locale or "").lower().startswith("en"):
        reply = (
            "HealthOS AI is not emergency care and is not a doctor. Your message may "
            "describe warning signs that need urgent help now. Please call your local "
            "emergency number or go to the nearest emergency department now."
        )
        if is_self_harm:
            reply += (
                " If you may hurt yourself or end your life, call emergency services "
                "or a crisis hotline now and stay with a trusted person if possible."
            )
        return reply
    reply = (
        "HealthOS AI không phải dịch vụ cấp cứu và không thay thế bác sĩ. Tin nhắn "
        "của bạn có thể có dấu hiệu cần trợ giúp khẩn cấp ngay. Vui lòng gọi số cấp "
        "cứu tại địa phương hoặc đến khoa cấp cứu gần nhất ngay bây giờ."
    )
    if is_self_harm:
        reply += (
            " Nếu bạn có ý định tự làm hại bản thân hoặc muốn kết thúc cuộc sống, "
            "hãy gọi cấp cứu hoặc đường dây hỗ trợ khủng hoảng ngay và ở cạnh người "
            "đáng tin cậy nếu có thể."
        )
    return reply

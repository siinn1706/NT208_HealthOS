"""Triage rule registry — versioned, code-reviewed, deterministic.

Authoritative source of truth for the safety routing engine. Rules are pure
data: each `Rule` has an `id`, a target `bucket`, an i18n `copy_key`, and a
`match_fn` that returns `TriageMatch | None` for a given `TriageInput`.

Engine pipeline (`triage_engine.evaluate`):

    RED_FLAGS         → emergency_now           (highest severity)
    URGENT_RULES      → urgent_same_day
    ROUTINE_RULES     → routine_gp
    SELF_CARE_RULES   → self_care_with_monitoring
    (no match)        → insufficient_info       (default-safe)

Conventions:
  * Token-based rules check both VI and EN tokens regardless of locale —
    users mix Vietnamese and English in real briefs. Defensive on purpose.
  * Tokens are lower-cased and whitespace-trimmed at match time.
  * Combined rules ("X AND Y in the same brief") AND across symptoms.
  * Category rules optionally gate on `concern_category`, severity, and
    duration — useful for "high severity in a short window" logic.
  * Every rule MUST have a unit test in `tests/services/test_triage_engine.py`
    (positive case + a negative case that the rule does NOT fire).

Bumping `RULESET_VERSION`:
  * Bump on ANY change to a rule's signal tokens, gating, bucket, or copy.
  * Bump is mandatory before merge — see CI lint in PR template.
  * `triage_outcomes.ruleset_version` lets us forensically replay any
    historical decision against the engine version that produced it.
"""
from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from app.models.visit_briefs import (
    ConcernCategoryEnum,
    TRIAGE_BUCKET_SEVERITY,
    TriageBucketEnum,
)


RULESET_VERSION = "v1.1.0"
DISCLAIMER_VERSION = "v1.1.0"


# ─────────────────────────────────────────────────────────────────────────────
# Input + match payload (read-only data classes)
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class SymptomInput:
    """Canonicalized symptom — what the engine actually consumes."""

    concern_text: str
    concern_category: str
    severity_0_10: Optional[int] = None
    duration_value: Optional[int] = None
    duration_unit: Optional[str] = None
    onset_date: Optional[datetime.date] = None
    triggers: Optional[str] = None
    better_with: Optional[str] = None
    worse_with: Optional[str] = None
    meds_taken: Optional[str] = None
    prior_care: Optional[str] = None
    context: Optional[dict[str, Any]] = None

    def haystack(self) -> str:
        """Concatenated free-text fields used for token matching."""
        parts = [
            self.concern_text or "",
            self.triggers or "",
            self.better_with or "",
            self.worse_with or "",
            self.meds_taken or "",
            self.prior_care or "",
        ]
        return " ".join(parts).lower()


@dataclass(frozen=True)
class TriageInput:
    symptoms: tuple[SymptomInput, ...]
    locale: str = "en"

    def all_text(self) -> str:
        """Concatenated haystack across every symptom in the brief."""
        return " ".join(s.haystack() for s in self.symptoms)


@dataclass(frozen=True)
class TriageMatch:
    """One signal that pushed the brief into a bucket."""

    rule_id: str
    signal: str
    severity: int
    copy_key: str
    bucket: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "signal": self.signal,
            "severity": self.severity,
            "copy_key": self.copy_key,
            "bucket": self.bucket,
        }


@dataclass(frozen=True)
class Rule:
    id: str
    bucket: str
    copy_key: str
    description_en: str
    description_vi: str
    tokens_en: tuple[str, ...] = field(default_factory=tuple)
    tokens_vi: tuple[str, ...] = field(default_factory=tuple)
    match_fn: Optional[Callable[[TriageInput], Optional[TriageMatch]]] = None


# ─────────────────────────────────────────────────────────────────────────────
# Helper builders
# ─────────────────────────────────────────────────────────────────────────────


def _to_days(value: Optional[int], unit: Optional[str]) -> Optional[float]:
    """Normalize duration to days. Hours → fractional, weeks/months → multiples."""
    if value is None or unit is None:
        return None
    if value < 0:
        return 0.0
    if unit == "hours":
        return value / 24.0
    if unit == "days":
        return float(value)
    if unit == "weeks":
        return value * 7.0
    if unit == "months":
        return value * 30.0
    return None


def _find_token_in(text: str, tokens: tuple[str, ...]) -> Optional[str]:
    """Return the first matching token (lower-cased substring search) or None."""
    for token in tokens:
        t = token.lower().strip()
        if not t:
            continue
        if t in text:
            return token
    return None


def token_rule(
    *,
    id: str,
    bucket: str,
    copy_key: str,
    description_en: str,
    description_vi: str,
    tokens_en: tuple[str, ...],
    tokens_vi: tuple[str, ...],
    only_categories: Optional[tuple[str, ...]] = None,
) -> Rule:
    """Rule that fires when ANY of `tokens_en` or `tokens_vi` appears in a
    symptom's free text. Optional `only_categories` further gates it to
    rows whose `concern_category` is in the allow-list.
    """

    def _match(inputs: TriageInput) -> Optional[TriageMatch]:
        for sym in inputs.symptoms:
            if only_categories and sym.concern_category not in only_categories:
                continue
            haystack = sym.haystack()
            matched = _find_token_in(haystack, tokens_en) or _find_token_in(
                haystack, tokens_vi
            )
            if matched:
                return TriageMatch(
                    rule_id=id,
                    signal=matched,
                    severity=TRIAGE_BUCKET_SEVERITY[bucket],
                    copy_key=copy_key,
                    bucket=bucket,
                )
        return None

    return Rule(
        id=id,
        bucket=bucket,
        copy_key=copy_key,
        description_en=description_en,
        description_vi=description_vi,
        tokens_en=tokens_en,
        tokens_vi=tokens_vi,
        match_fn=_match,
    )


def combined_rule(
    *,
    id: str,
    bucket: str,
    copy_key: str,
    description_en: str,
    description_vi: str,
    token_groups: tuple[tuple[str, ...], ...],
) -> Rule:
    """Rule that fires only when EVERY token group matches WITHIN A SINGLE
    symptom's free text. Used for compound red flags like "chest pain
    AND shortness of breath" — both must be in the same concern, not
    spread across unrelated symptoms.

    Review fix M3: previously matched across the whole brief, which falsely
    fired emergency for e.g. "history of chest pain" + "asthma at night".
    """

    def _match(inputs: TriageInput) -> Optional[TriageMatch]:
        for sym in inputs.symptoms:
            haystack = sym.haystack()
            signals: list[str] = []
            all_groups_matched = True
            for group in token_groups:
                found = _find_token_in(haystack, group)
                if not found:
                    all_groups_matched = False
                    break
                signals.append(found)
            if all_groups_matched:
                return TriageMatch(
                    rule_id=id,
                    signal=" + ".join(signals),
                    severity=TRIAGE_BUCKET_SEVERITY[bucket],
                    copy_key=copy_key,
                    bucket=bucket,
                )
        return None

    flat_en = tuple(t for g in token_groups for t in g)
    return Rule(
        id=id,
        bucket=bucket,
        copy_key=copy_key,
        description_en=description_en,
        description_vi=description_vi,
        tokens_en=flat_en,
        tokens_vi=(),
        match_fn=_match,
    )


def category_rule(
    *,
    id: str,
    bucket: str,
    copy_key: str,
    description_en: str,
    description_vi: str,
    categories: tuple[str, ...],
    min_severity: Optional[int] = None,
    max_severity: Optional[int] = None,
    min_duration_days: Optional[float] = None,
    max_duration_days: Optional[float] = None,
) -> Rule:
    """Rule that fires when a symptom matches a category and optional
    severity/duration window. Severity filters are inclusive."""

    def _match(inputs: TriageInput) -> Optional[TriageMatch]:
        for sym in inputs.symptoms:
            if sym.concern_category not in categories:
                continue
            sev = sym.severity_0_10
            if min_severity is not None:
                if sev is None or sev < min_severity:
                    continue
            if max_severity is not None:
                if sev is None or sev > max_severity:
                    continue
            duration_days = _to_days(sym.duration_value, sym.duration_unit)
            if min_duration_days is not None:
                if duration_days is None or duration_days < min_duration_days:
                    continue
            if max_duration_days is not None:
                if duration_days is None or duration_days > max_duration_days:
                    continue
            return TriageMatch(
                rule_id=id,
                signal=sym.concern_category,
                severity=TRIAGE_BUCKET_SEVERITY[bucket],
                copy_key=copy_key,
                bucket=bucket,
            )
        return None

    return Rule(
        id=id,
        bucket=bucket,
        copy_key=copy_key,
        description_en=description_en,
        description_vi=description_vi,
        match_fn=_match,
    )


def context_rule(
    *,
    id: str,
    bucket: str,
    copy_key: str,
    description_en: str,
    description_vi: str,
    require_keys: tuple[str, ...],
    also_categories: Optional[tuple[str, ...]] = None,
) -> Rule:
    """Rule that fires when EVERY required key in `context` is truthy.

    Used for structured-flag checks like `context.is_infant=true`. Optionally
    gated on category to keep "infant + fever" tight.
    """

    def _match(inputs: TriageInput) -> Optional[TriageMatch]:
        for sym in inputs.symptoms:
            if also_categories and sym.concern_category not in also_categories:
                continue
            if not sym.context:
                continue
            if all(bool(sym.context.get(k)) for k in require_keys):
                return TriageMatch(
                    rule_id=id,
                    signal=" + ".join(require_keys),
                    severity=TRIAGE_BUCKET_SEVERITY[bucket],
                    copy_key=copy_key,
                    bucket=bucket,
                )
        return None

    return Rule(
        id=id,
        bucket=bucket,
        copy_key=copy_key,
        description_en=description_en,
        description_vi=description_vi,
        match_fn=_match,
    )


# ─────────────────────────────────────────────────────────────────────────────
# RED FLAGS  →  emergency_now
# Aligned with NHS 111 / NICE red-flag guidance. Each rule must have a
# regression test in `tests/services/test_triage_engine.py`.
# ─────────────────────────────────────────────────────────────────────────────

RED_FLAGS: tuple[Rule, ...] = (
    # Stroke FAST: any one symptom is enough.
    token_rule(
        id="rf-stroke-face",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.stroke_face",
        description_en="Sudden facial droop / asymmetry — needs urgent assessment (FAST)",
        description_vi="Liệt mặt đột ngột / mặt méo - cần được khám khẩn (FAST)",
        # Review fix S4: lay-language stroke FAST campaigns explicitly use
        # phrases like "smile is crooked"; clinical-only tokens missed real
        # patient phrasing.
        tokens_en=(
            "face droop",
            "facial droop",
            "drooping face",
            "face feels droopy",
            "feels droopy",
            "droopy face",
            "one side of face",
            "face is drooping",
            "half my face",
            "smile is crooked",
            "crooked smile",
            "smile looks weird",
            "smile is uneven",
            "mouth feels weird",
            "feel weird on one side of",
            "weird on one side of my face",
            "face on one side",
        ),
        tokens_vi=(
            "liệt mặt",
            "méo miệng",
            "méo mặt",
            "lệch mặt",
            "miệng lệch",
            "cười lệch",
            "một bên mặt",
        ),
    ),
    token_rule(
        id="rf-stroke-arm",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.stroke_arm",
        description_en="Sudden one-sided arm weakness — needs urgent assessment (FAST)",
        description_vi="Yếu một bên tay đột ngột - cần được khám khẩn (FAST)",
        tokens_en=(
            "arm weakness",
            "weak arm",
            "arm feels weak",
            "arm goes weak",
            "can't raise arm",
            "cannot lift arm",
            "can't lift my arm",
            "cant raise my arm",
            "can't move my arm",
            "arm doesn't work",
            "arm doesnt work",
            "hand stopped working",
            "can't grip",
            "cant grip",
            "cannot grip",
            "lost grip in",
        ),
        tokens_vi=(
            "yếu tay",
            "liệt tay",
            "tay yếu",
            "không nhấc được tay",
            "tay không cử động",
            "mất lực tay",
        ),
    ),
    token_rule(
        id="rf-stroke-speech",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.stroke_speech",
        description_en="Sudden slurred / confused speech — needs urgent assessment (FAST)",
        description_vi="Nói khó / nói lắp đột ngột - cần được khám khẩn (FAST)",
        tokens_en=(
            "slurred speech",
            "cannot speak",
            "can't speak",
            "speech difficulty",
            "can't find my words",
            "cant find my words",
            "lost my words",
            "words come out wrong",
            "can't put words together",
            "cant put words together",
            "trouble speaking",
            "speech is jumbled",
        ),
        tokens_vi=(
            "nói lắp",
            "nói khó",
            "không nói được",
            "không tìm được từ",
            "nói không ra lời",
            "nói lộn xộn",
        ),
    ),
    # Cardiac event signals.
    # Review fix S2: token groups expanded with common typos + paraphrases.
    # Patient phrasings that previously slipped through ("cant breath",
    # "hurts in my chest", "tight chest") now match.
    combined_rule(
        id="rf-cardiac-chest-sob",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.cardiac_chest_sob",
        description_en="Chest pain together with shortness of breath",
        description_vi="Đau ngực kèm khó thở",
        token_groups=(
            (
                # Chest cluster
                "chest pain",
                "chest pressure",
                "chest tightness",
                "tight chest",
                "tightness in my chest",
                "pain in chest",
                "pain in my chest",
                "hurts in my chest",
                "hurts in chest",
                "squeezing chest",
                "squeezing in my chest",
                "crushing chest",
                "đau ngực",
                "tức ngực",
                "đau tức ngực",
                "nặng ngực",
                "ngực đau",
            ),
            (
                # Breathing cluster
                "shortness of breath",
                "short of breath",
                "short of breth",
                "can't breathe",
                "cant breathe",
                "can't breath",
                "cant breath",
                "cannot breath",
                "cannot breathe",
                "hard to breathe",
                "hard to breath",
                "difficulty breathing",
                "trouble breathing",
                "breathless",
                "out of breath",
                "khó thở",
                "hụt hơi",
                "thở không ra hơi",
                "ngộp thở",
            ),
        ),
    ),
    combined_rule(
        id="rf-cardiac-chest-radiating",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.cardiac_chest_radiating",
        description_en="Chest pain radiating to arm or jaw",
        description_vi="Đau ngực lan ra tay hoặc hàm",
        token_groups=(
            (
                "chest pain",
                "chest pressure",
                "chest tightness",
                "tight chest",
                "pain in chest",
                "pain in my chest",
                "hurts in my chest",
                "đau ngực",
                "tức ngực",
                "đau tức ngực",
            ),
            (
                "radiating to arm",
                "radiating to jaw",
                "into my arm",
                "into my jaw",
                "down my arm",
                "up to my jaw",
                "spreading to arm",
                "spreading to jaw",
                "lan ra tay",
                "lan ra hàm",
                "lan lên hàm",
                "lan xuống tay",
            ),
        ),
    ),
    # Severe respiratory distress.
    token_rule(
        id="rf-sob-at-rest",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.sob_at_rest",
        description_en="Shortness of breath at rest / can't catch breath",
        description_vi="Khó thở khi nghỉ ngơi / không lấy được hơi",
        tokens_en=(
            "shortness of breath at rest",
            "can't catch my breath",
            "cannot catch my breath",
            "gasping for air",
        ),
        tokens_vi=("khó thở khi nghỉ", "khó thở dữ dội", "không thở được"),
    ),
    # Anaphylaxis: airway swelling + breathing difficulty.
    combined_rule(
        id="rf-anaphylaxis",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.anaphylaxis",
        description_en="Lip / tongue / throat swelling with breathing difficulty",
        description_vi="Sưng môi / lưỡi / họng kèm khó thở",
        token_groups=(
            (
                "lip swelling",
                "tongue swelling",
                "throat swelling",
                "swollen tongue",
                "swollen throat",
                "sưng môi",
                "sưng lưỡi",
                "sưng họng",
            ),
            (
                "shortness of breath",
                "can't breathe",
                "wheezing",
                "khó thở",
                "thở khò khè",
            ),
        ),
    ),
    # Severe / uncontrolled bleeding.
    token_rule(
        id="rf-uncontrolled-bleeding",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.uncontrolled_bleeding",
        description_en="Bleeding that won't stop / uncontrolled bleeding",
        description_vi="Chảy máu không cầm được",
        tokens_en=(
            "uncontrolled bleeding",
            "won't stop bleeding",
            "wont stop bleeding",
            "bleeding heavily",
            "heavy bleeding",
            "bleeding profusely",
        ),
        tokens_vi=("chảy máu không cầm", "chảy máu nhiều", "máu chảy không ngừng"),
    ),
    # Sudden severe headache (thunderclap pattern).
    token_rule(
        id="rf-thunderclap-headache",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.thunderclap_headache",
        description_en="Sudden 'worst ever' headache — thunderclap pattern",
        description_vi="Đau đầu dữ dội nhất từng có - cơn đau sét đánh",
        tokens_en=(
            "worst headache of my life",
            "worst headache ever",
            "thunderclap headache",
            "sudden severe headache",
        ),
        tokens_vi=("đau đầu dữ dội nhất", "đau đầu kinh khủng", "đau đầu sét đánh"),
    ),
    # Suicidal ideation — treat any explicit OR passive mention as red flag.
    # Review fix S1: expanded to include passive ideation phrasing the original
    # token list missed ("don't want to be alive", "no point any more",
    # "wish I wasn't here"). Crisis hotlines use this lay phrasing because
    # patients in distress rarely use clinical words like "suicidal".
    token_rule(
        id="rf-suicidal-ideation",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.suicidal_ideation",
        description_en="Thoughts of self-harm or not wanting to be alive",
        description_vi="Có ý nghĩ tự làm hại bản thân hoặc không muốn sống",
        tokens_en=(
            "suicidal",
            "suicide",
            "kill myself",
            "end my life",
            "end it all",
            "want to die",
            "wish i was dead",
            "wish i were dead",
            "self-harm",
            "self harm",
            "hurt myself",
            "harm myself",
            # Passive ideation
            "don't want to be alive",
            "dont want to be alive",
            "do not want to be alive",
            "wish i wasn't here",
            "wish i wasnt here",
            "wish i was not here",
            "better off dead",
            "better off without me",
            "no point any more",
            "no point anymore",
            "no point in living",
            "can't go on",
            "cant go on",
            "cannot go on",
            "give up on life",
            "ending it all",
            "no reason to live",
        ),
        tokens_vi=(
            "tự sát",
            "tự tử",
            "muốn chết",
            "muốn kết thúc cuộc sống",
            "tự làm hại",
            "làm hại bản thân",
            "không muốn sống",
            "không thiết sống",
            "không muốn tồn tại",
            "sống không có ý nghĩa",
            "không còn lý do để sống",
            "kết thúc tất cả",
            "không thể tiếp tục",
        ),
    ),
    # New focal neurological deficit.
    token_rule(
        id="rf-focal-neuro",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.focal_neuro",
        description_en="New one-sided numbness / sudden vision loss / focal deficit",
        description_vi="Tê một bên người mới xuất hiện / mất thị lực đột ngột",
        tokens_en=(
            "numbness on one side",
            "one-sided numbness",
            "sudden vision loss",
            "lost vision",
            "vision loss",
            "can't see",
        ),
        tokens_vi=("tê một bên", "mất thị lực", "không nhìn thấy", "tê liệt"),
    ),
    # Loss of consciousness / major trauma.
    token_rule(
        id="rf-loss-consciousness",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.loss_consciousness",
        description_en="Lost consciousness / passed out",
        description_vi="Mất ý thức / ngất xỉu",
        tokens_en=(
            "passed out",
            "lost consciousness",
            "blacked out",
            "fainted and didn't wake",
        ),
        tokens_vi=("ngất xỉu", "bất tỉnh", "mất ý thức"),
    ),
    # Infant fever (caregiver brief, age < 3 months).
    context_rule(
        id="rf-infant-fever",
        bucket=TriageBucketEnum.EMERGENCY_NOW.value,
        copy_key="visitPrep.routing.signals.infant_fever",
        description_en="Fever in an infant under 3 months",
        description_vi="Trẻ dưới 3 tháng tuổi bị sốt",
        require_keys=("is_infant_under_3mo",),
        also_categories=(ConcernCategoryEnum.FEVER.value,),
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# URGENT  →  urgent_same_day
# ─────────────────────────────────────────────────────────────────────────────

URGENT_RULES: tuple[Rule, ...] = (
    # High severity cardiac symptoms (any cardio category symptom with high severity).
    category_rule(
        id="ur-cardio-high-severity",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.cardio_high_severity",
        description_en="Cardiovascular concern with high severity",
        description_vi="Triệu chứng tim mạch ở mức độ nặng",
        categories=(ConcernCategoryEnum.CARDIO.value,),
        min_severity=7,
    ),
    # High severity respiratory symptoms.
    category_rule(
        id="ur-resp-high-severity",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.resp_high_severity",
        description_en="Respiratory concern with high severity",
        description_vi="Khó thở mức độ nặng",
        categories=(ConcernCategoryEnum.RESP.value,),
        min_severity=7,
    ),
    # Severe pain with acute onset (≤ 24h, severity ≥ 8).
    category_rule(
        id="ur-acute-severe-pain",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.acute_severe_pain",
        description_en="Severe pain that started in the last day",
        description_vi="Đau dữ dội mới xuất hiện trong vòng 24 giờ",
        categories=(ConcernCategoryEnum.PAIN.value,),
        min_severity=8,
        max_duration_days=1.0,
    ),
    # Acute high fever in an adult.
    token_rule(
        id="ur-high-fever",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.high_fever",
        description_en="High fever (39°C / 102°F or above) reported by user",
        description_vi="Sốt cao (39°C trở lên)",
        tokens_en=("39 degrees", "39c", "39 c", "102 f", "high fever", "very high fever"),
        tokens_vi=("sốt cao", "sốt 39", "sốt 40"),
        only_categories=(ConcernCategoryEnum.FEVER.value,),
    ),
    # Mental health crisis without explicit plan (passive ideation).
    token_rule(
        id="ur-mental-crisis-passive",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.mental_crisis_passive",
        description_en="Mental health crisis with hopelessness / can't cope",
        description_vi="Khủng hoảng tâm lý / cảm giác tuyệt vọng",
        tokens_en=(
            "can't cope",
            "cannot cope",
            "hopeless",
            "panic attack",
            "panic attacks",
        ),
        tokens_vi=(
            "không thể chịu nổi",
            "tuyệt vọng",
            "cơn hoảng loạn",
            "cơn hoảng sợ",
        ),
        only_categories=(ConcernCategoryEnum.MENTAL.value,),
    ),
    # Acute severe GI: vomiting blood / blood in stool.
    token_rule(
        id="ur-gi-bleeding",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.gi_bleeding",
        description_en="Vomiting blood or blood in stool",
        description_vi="Nôn ra máu hoặc đi ngoài ra máu",
        tokens_en=(
            "vomiting blood",
            "blood in stool",
            "blood in vomit",
            "black stool",
            "tarry stool",
        ),
        tokens_vi=(
            "nôn ra máu",
            "đi ngoài ra máu",
            "phân đen",
            "máu trong phân",
        ),
    ),
    # Defense-in-depth: ANY mental-health concern that hasn't already escalated
    # to a red flag gets at-least urgent routing. The original rule lived in
    # ROUTINE_RULES, which meant passive ideation that slipped through the
    # red-flag tokens (review S1) was directed to "book a routine appointment"
    # — actively harmful for a user in distress. Keeping the same copy_key so
    # i18n strings don't need a migration.
    category_rule(
        id="ur-mental-default-anything",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.mental_default",
        description_en="Mental health concern that warrants same-day support",
        description_vi="Mối quan tâm về sức khỏe tâm thần cần được hỗ trợ trong ngày",
        categories=(ConcernCategoryEnum.MENTAL.value,),
    ),
    # NSAID / paracetamol overuse — review fix T2.
    # Free-text scan over `meds_taken` for common overdose phrasing. Better
    # detection would parse "N <drug>" patterns against a daily-dose lookup,
    # but a curated keyword list catches the obvious cases without false
    # positives on prescription doses.
    token_rule(
        id="ur-meds-overuse",
        bucket=TriageBucketEnum.URGENT_SAME_DAY.value,
        copy_key="visitPrep.routing.signals.meds_overuse",
        description_en="Possible medication overuse / overdose described in meds taken",
        description_vi="Có thể đang dùng thuốc quá liều theo phần thuốc đã uống",
        tokens_en=(
            "overdose",
            "took too many",
            "took too much",
            "more than the box says",
            "more than recommended",
            "doubled the dose",
            "double dose",
            "5 ibuprofen",
            "6 ibuprofen",
            "7 ibuprofen",
            "8 ibuprofen",
            "many ibuprofen",
            "lots of ibuprofen",
            "5 paracetamol",
            "6 paracetamol",
            "8 paracetamol",
            "10 paracetamol",
            "12 paracetamol",
            "many paracetamol",
            "lots of paracetamol",
            "many tylenol",
            "lots of tylenol",
            "many advil",
            "lots of advil",
        ),
        tokens_vi=(
            "quá liều",
            "uống quá liều",
            "uống quá nhiều",
            "uống nhiều thuốc",
            "gấp đôi liều",
            "5 viên ibuprofen",
            "6 viên ibuprofen",
            "8 viên ibuprofen",
            "5 viên paracetamol",
            "6 viên paracetamol",
            "8 viên paracetamol",
            "10 viên paracetamol",
            "nhiều viên paracetamol",
        ),
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# ROUTINE  →  routine_gp
# Persistent moderate symptoms, follow-up needs, chronic management.
# ─────────────────────────────────────────────────────────────────────────────

ROUTINE_RULES: tuple[Rule, ...] = (
    # Moderate symptoms persisting ≥ 3 days in any category.
    category_rule(
        id="rt-persistent-moderate",
        bucket=TriageBucketEnum.ROUTINE_GP.value,
        copy_key="visitPrep.routing.signals.persistent_moderate",
        description_en="Moderate symptoms persisting 3+ days",
        description_vi="Triệu chứng vừa phải kéo dài từ 3 ngày trở lên",
        categories=tuple(c.value for c in ConcernCategoryEnum),
        min_severity=4,
        max_severity=7,
        min_duration_days=3.0,
    ),
    # Anything lasting > 7 days regardless of severity (persistent enough to see GP).
    category_rule(
        id="rt-long-duration",
        bucket=TriageBucketEnum.ROUTINE_GP.value,
        copy_key="visitPrep.routing.signals.long_duration",
        description_en="Symptoms lasting more than a week",
        description_vi="Triệu chứng kéo dài hơn một tuần",
        categories=tuple(c.value for c in ConcernCategoryEnum),
        min_duration_days=7.0,
    ),
    # NOTE: the previous `rt-mental-default` rule was promoted to URGENT
    # (`ur-mental-default-anything`) as defense-in-depth. See review fix S1.
)


# ─────────────────────────────────────────────────────────────────────────────
# SELF CARE  →  self_care_with_monitoring
# Mild self-limiting symptoms; user is encouraged to monitor and book an
# appointment if anything worsens.
# ─────────────────────────────────────────────────────────────────────────────

SELF_CARE_RULES: tuple[Rule, ...] = (
    category_rule(
        id="sc-mild-short-pain",
        bucket=TriageBucketEnum.SELF_CARE_WITH_MONITORING.value,
        copy_key="visitPrep.routing.signals.mild_short_pain",
        description_en="Mild pain lasting fewer than 3 days",
        description_vi="Đau nhẹ kéo dài dưới 3 ngày",
        categories=(ConcernCategoryEnum.PAIN.value,),
        max_severity=3,
        max_duration_days=3.0,
    ),
    category_rule(
        id="sc-mild-short-gi",
        bucket=TriageBucketEnum.SELF_CARE_WITH_MONITORING.value,
        copy_key="visitPrep.routing.signals.mild_short_gi",
        description_en="Mild gastrointestinal upset lasting fewer than 3 days",
        description_vi="Khó chịu tiêu hóa nhẹ kéo dài dưới 3 ngày",
        categories=(ConcernCategoryEnum.GI.value,),
        max_severity=3,
        max_duration_days=3.0,
    ),
    category_rule(
        id="sc-mild-short-fever",
        bucket=TriageBucketEnum.SELF_CARE_WITH_MONITORING.value,
        copy_key="visitPrep.routing.signals.mild_short_fever",
        description_en="Mild fever lasting fewer than 3 days",
        description_vi="Sốt nhẹ kéo dài dưới 3 ngày",
        categories=(ConcernCategoryEnum.FEVER.value,),
        max_severity=3,
        max_duration_days=3.0,
    ),
    category_rule(
        id="sc-mild-short-skin",
        bucket=TriageBucketEnum.SELF_CARE_WITH_MONITORING.value,
        copy_key="visitPrep.routing.signals.mild_short_skin",
        description_en="Mild skin concern lasting fewer than 3 days",
        description_vi="Vấn đề về da ở mức nhẹ kéo dài dưới 3 ngày",
        categories=(ConcernCategoryEnum.SKIN.value,),
        max_severity=3,
        max_duration_days=3.0,
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# Public registry — order matters. Engine evaluates highest severity first.
# ─────────────────────────────────────────────────────────────────────────────

ALL_RULES_BY_BUCKET: tuple[tuple[str, tuple[Rule, ...]], ...] = (
    (TriageBucketEnum.EMERGENCY_NOW.value, RED_FLAGS),
    (TriageBucketEnum.URGENT_SAME_DAY.value, URGENT_RULES),
    (TriageBucketEnum.ROUTINE_GP.value, ROUTINE_RULES),
    (TriageBucketEnum.SELF_CARE_WITH_MONITORING.value, SELF_CARE_RULES),
)


def all_rule_ids() -> set[str]:
    """Used by the safety regression suite to assert every rule is covered
    by at least one positive scenario in `tests/safety/scenarios.yaml`.
    """
    ids: set[str] = set()
    for _, rules in ALL_RULES_BY_BUCKET:
        for r in rules:
            ids.add(r.id)
    return ids

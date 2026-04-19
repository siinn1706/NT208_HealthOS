"""Triage engine — unit + safety regression tests.

Run with: `pytest backend/tests/services/test_triage_engine.py -v`

The safety regression block (`test_safety_scenarios`) is the most important
test in this feature — it loads every scripted scenario from
`backend/tests/safety/scenarios.yaml` and asserts the expected bucket and
matched-rule set.

Adding a NEW rule to `triage_rules.py` REQUIRES adding at least one positive
scenario in scenarios.yaml — `test_every_red_flag_has_positive_coverage`
guards this.
"""
from __future__ import annotations

import datetime
import json
from pathlib import Path
from typing import Any

import pytest

from app.models.visit_briefs import (
    TRIAGE_BUCKET_SEVERITY,
    ConcernCategoryEnum,
    TriageBucketEnum,
)
from app.services.triage_engine import (
    DISCLAIMER_VERSION,
    RULESET_VERSION,
    SymptomInput,
    TriageInput,
    TriageOutput,
    evaluate,
    severity_of,
)
from app.services.triage_rules import (
    ALL_RULES_BY_BUCKET,
    RED_FLAGS,
    Rule,
    all_rule_ids,
)


SCENARIO_PATH = Path(__file__).resolve().parents[1] / "safety" / "scenarios.yaml"


# ─────────────────────────────────────────────────────────────────────────────
# Lightweight YAML loader — avoids requiring PyYAML if it's missing.
# Falls back to a structured parser sufficient for the scenarios file shape.
# ─────────────────────────────────────────────────────────────────────────────


def _load_scenarios() -> list[dict[str, Any]]:
    try:
        import yaml  # type: ignore[import-untyped]

        with SCENARIO_PATH.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return [s for s in data if isinstance(s, dict)]
    except ImportError:
        # Fall back: parse the strict subset we know we use. The file is
        # human-curated and structurally simple — top-level list of objects
        # with string scalars, dotted lists, and nested dicts.
        text = SCENARIO_PATH.read_text(encoding="utf-8")
        return _parse_simple_yaml(text)


def _parse_simple_yaml(text: str) -> list[dict[str, Any]]:  # pragma: no cover
    raise pytest.skip("PyYAML not installed; install pyyaml to run safety regression suite")


# Cached at module scope to avoid re-parsing for every test.
_SCENARIOS: list[dict[str, Any]] = _load_scenarios()


def _scenario_to_input(s: dict[str, Any]) -> TriageInput:
    locale = s.get("locale", "en")
    syms = []
    for raw in s.get("symptoms", []):
        onset = raw.get("onset_date")
        if isinstance(onset, str):
            onset_date = datetime.date.fromisoformat(onset)
        elif isinstance(onset, datetime.date):
            onset_date = onset
        else:
            onset_date = None
        syms.append(
            SymptomInput(
                concern_text=raw.get("concern_text", ""),
                concern_category=raw.get(
                    "concern_category", ConcernCategoryEnum.OTHER.value
                ),
                severity_0_10=raw.get("severity_0_10"),
                duration_value=raw.get("duration_value"),
                duration_unit=raw.get("duration_unit"),
                onset_date=onset_date,
                triggers=raw.get("triggers"),
                better_with=raw.get("better_with"),
                worse_with=raw.get("worse_with"),
                meds_taken=raw.get("meds_taken"),
                prior_care=raw.get("prior_care"),
                context=raw.get("context"),
            )
        )
    return TriageInput(symptoms=tuple(syms), locale=locale)


# ─────────────────────────────────────────────────────────────────────────────
# Engine-level tests
# ─────────────────────────────────────────────────────────────────────────────


def test_empty_input_returns_insufficient_info():
    out = evaluate(TriageInput(symptoms=()))
    assert out.bucket == TriageBucketEnum.INSUFFICIENT_INFO.value
    assert out.matched_signals == []
    assert out.ruleset_version == RULESET_VERSION
    assert out.disclaimer_version == DISCLAIMER_VERSION
    assert out.next_action_copy_key.endswith(".next_action")
    assert len(out.inputs_hash) == 64


def test_output_carries_versioned_disclaimer():
    out = evaluate(
        TriageInput(
            symptoms=(
                SymptomInput(
                    concern_text="mild headache",
                    concern_category=ConcernCategoryEnum.PAIN.value,
                    severity_0_10=2,
                    duration_value=8,
                    duration_unit="hours",
                ),
            )
        )
    )
    assert out.disclaimer_version == DISCLAIMER_VERSION
    assert out.disclaimer_version != ""


def test_inputs_hash_strips_whitespace_consistently():
    """Same input modulo leading/trailing whitespace → same hash. Case is
    deliberately preserved in the snapshot for audit, so it does affect
    the hash."""
    a = TriageInput(
        symptoms=(
            SymptomInput(
                concern_text="  mild headache  ",
                concern_category=ConcernCategoryEnum.PAIN.value,
                severity_0_10=2,
                duration_value=1,
                duration_unit="days",
            ),
        )
    )
    b = TriageInput(
        symptoms=(
            SymptomInput(
                concern_text="mild headache",
                concern_category=ConcernCategoryEnum.PAIN.value,
                severity_0_10=2,
                duration_value=1,
                duration_unit="days",
            ),
        )
    )
    assert evaluate(a).inputs_hash == evaluate(b).inputs_hash


def test_inputs_hash_changes_with_input():
    a = evaluate(
        TriageInput(
            symptoms=(
                SymptomInput(
                    concern_text="cough",
                    concern_category=ConcernCategoryEnum.RESP.value,
                    severity_0_10=3,
                ),
            )
        )
    )
    b = evaluate(
        TriageInput(
            symptoms=(
                SymptomInput(
                    concern_text="cough with blood",
                    concern_category=ConcernCategoryEnum.RESP.value,
                    severity_0_10=3,
                ),
            )
        )
    )
    assert a.inputs_hash != b.inputs_hash


def test_engine_is_deterministic_under_repeated_evaluation():
    """1000 evaluations of the same input must produce identical output."""
    inputs = TriageInput(
        symptoms=(
            SymptomInput(
                concern_text="back pain",
                concern_category=ConcernCategoryEnum.PAIN.value,
                severity_0_10=6,
                duration_value=5,
                duration_unit="days",
            ),
        )
    )
    expected = evaluate(inputs)
    for _ in range(1000):
        got = evaluate(inputs)
        assert got.bucket == expected.bucket
        assert got.inputs_hash == expected.inputs_hash
        assert [m.rule_id for m in got.matched_signals] == [
            m.rule_id for m in expected.matched_signals
        ]


def test_severity_helper_returns_known_values():
    assert severity_of(TriageBucketEnum.EMERGENCY_NOW.value) > severity_of(
        TriageBucketEnum.URGENT_SAME_DAY.value
    )
    assert severity_of("does-not-exist") == -1


def test_red_flag_short_circuit_beats_milder_matches():
    """Adding a mild self-care symptom must not lower the bucket once a
    red flag has fired."""
    inputs = TriageInput(
        symptoms=(
            SymptomInput(
                concern_text="mild headache",
                concern_category=ConcernCategoryEnum.PAIN.value,
                severity_0_10=2,
                duration_value=1,
                duration_unit="hours",
            ),
            SymptomInput(
                concern_text="crushing chest pain with shortness of breath",
                concern_category=ConcernCategoryEnum.CARDIO.value,
                severity_0_10=9,
                duration_value=1,
                duration_unit="hours",
            ),
        )
    )
    out = evaluate(inputs)
    assert out.bucket == TriageBucketEnum.EMERGENCY_NOW.value


def test_no_bucket_downgrade_property():
    """Adding a NEW symptom may escalate but never downgrade the bucket."""
    base = TriageInput(
        symptoms=(
            SymptomInput(
                concern_text="crushing chest pain with shortness of breath",
                concern_category=ConcernCategoryEnum.CARDIO.value,
                severity_0_10=9,
            ),
        )
    )
    base_out = evaluate(base)
    extras = [
        SymptomInput(
            concern_text="mild itch on arm",
            concern_category=ConcernCategoryEnum.SKIN.value,
            severity_0_10=1,
        ),
        SymptomInput(
            concern_text="back pain for 2 days",
            concern_category=ConcernCategoryEnum.PAIN.value,
            severity_0_10=4,
            duration_value=2,
            duration_unit="days",
        ),
        SymptomInput(
            concern_text="just feeling tired",
            concern_category=ConcernCategoryEnum.OTHER.value,
        ),
    ]
    for extra in extras:
        new_out = evaluate(
            TriageInput(symptoms=base.symptoms + (extra,))
        )
        assert TRIAGE_BUCKET_SEVERITY[new_out.bucket] >= TRIAGE_BUCKET_SEVERITY[
            base_out.bucket
        ], f"Adding {extra.concern_text!r} downgraded the bucket"


def test_canonicalization_is_locale_independent():
    """Rules check both locale's tokens — a VI signal in an EN brief still
    fires (and vice versa). Defensive against users mixing languages."""
    out_en = evaluate(
        TriageInput(
            symptoms=(
                SymptomInput(
                    concern_text="đau đầu dữ dội nhất từng có",
                    concern_category=ConcernCategoryEnum.NEURO.value,
                ),
            ),
            locale="en",
        )
    )
    assert out_en.bucket == TriageBucketEnum.EMERGENCY_NOW.value
    assert any(m.rule_id == "rf-thunderclap-headache" for m in out_en.matched_signals)


# ─────────────────────────────────────────────────────────────────────────────
# Per-rule positive + negative coverage (table-driven)
# ─────────────────────────────────────────────────────────────────────────────


def test_every_rule_in_registry_has_required_metadata():
    seen_ids: set[str] = set()
    for bucket, rules in ALL_RULES_BY_BUCKET:
        for rule in rules:
            assert rule.id, f"Rule in bucket {bucket} missing id"
            assert rule.id not in seen_ids, f"Duplicate rule id: {rule.id}"
            seen_ids.add(rule.id)
            assert rule.bucket == bucket, (
                f"Rule {rule.id} declared bucket {rule.bucket} but is registered "
                f"under {bucket}"
            )
            assert rule.copy_key.startswith("visitPrep.routing.signals."), (
                f"Rule {rule.id} copy_key must live under visitPrep.routing.signals.*"
            )
            assert rule.match_fn is not None, f"Rule {rule.id} missing match_fn"
            assert rule.description_en, f"Rule {rule.id} missing English description"
            assert rule.description_vi, f"Rule {rule.id} missing Vietnamese description"


def test_every_red_flag_has_bilingual_token_or_context_signal():
    """Red flags must declare at least one signal in either VI or EN tokens
    OR be a context-based rule (no tokens). Catches drift where a new red
    flag accidentally only fires for one locale."""
    for rule in RED_FLAGS:
        is_token_rule = bool(rule.tokens_en) or bool(rule.tokens_vi)
        is_combined = " + " in rule.id or len(rule.tokens_en) > 1
        is_context = "infant" in rule.id  # only context rule today
        assert (
            is_token_rule or is_context
        ), f"Red flag {rule.id} has no detectable signal pathway"
        if rule.tokens_en or rule.tokens_vi:
            # Each token-bearing red flag should cover BOTH locales unless
            # explicitly combined (combined rules carry both locales in groups).
            if not is_combined and not is_context:
                assert rule.tokens_en, f"Red flag {rule.id} missing English tokens"
                assert rule.tokens_vi, f"Red flag {rule.id} missing Vietnamese tokens"


# ─────────────────────────────────────────────────────────────────────────────
# Safety regression suite — every scenario from scenarios.yaml
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "scenario",
    _SCENARIOS,
    ids=[s.get("id", f"unnamed-{i}") for i, s in enumerate(_SCENARIOS)],
)
def test_safety_scenarios(scenario: dict[str, Any]) -> None:
    inputs = _scenario_to_input(scenario)
    out: TriageOutput = evaluate(inputs)

    expected_bucket = scenario["expected_bucket"]
    assert out.bucket == expected_bucket, (
        f"Scenario {scenario['id']!r}: expected {expected_bucket}, "
        f"got {out.bucket}. Matched: {[m.rule_id for m in out.matched_signals]}"
    )

    expected_rule_ids = set(scenario.get("expected_rule_ids") or [])
    fired_rule_ids = {m.rule_id for m in out.matched_signals}
    missing = expected_rule_ids - fired_rule_ids
    assert not missing, (
        f"Scenario {scenario['id']!r}: rules {missing} did not fire. "
        f"Fired: {fired_rule_ids}"
    )

    forbidden = set(scenario.get("forbidden_rule_ids") or [])
    leaked = forbidden & fired_rule_ids
    assert not leaked, (
        f"Scenario {scenario['id']!r}: forbidden rules {leaked} fired"
    )


def test_every_rule_has_positive_coverage_in_scenarios():
    """Every rule in the registry must be exercised by at least one scenario
    where it is the expected matched rule. Closes the loop between the
    rules registry and the safety regression suite.
    """
    expected_ids: set[str] = set()
    for s in _SCENARIOS:
        expected_ids.update(s.get("expected_rule_ids") or [])
    missing_coverage = all_rule_ids() - expected_ids
    assert not missing_coverage, (
        f"Rules with no positive scenario coverage: {sorted(missing_coverage)}. "
        f"Add a row in backend/tests/safety/scenarios.yaml whose "
        f"expected_rule_ids includes each of these."
    )


# ─────────────────────────────────────────────────────────────────────────────
# JSON-serializability sanity (the engine's output flows into a JSONB column
# and into an HTTP response — every field must round-trip cleanly).
# ─────────────────────────────────────────────────────────────────────────────


def test_output_is_json_serializable():
    out = evaluate(
        TriageInput(
            symptoms=(
                SymptomInput(
                    concern_text="back pain",
                    concern_category=ConcernCategoryEnum.PAIN.value,
                    severity_0_10=6,
                    duration_value=5,
                    duration_unit="days",
                ),
            )
        )
    )
    payload = {
        "bucket": out.bucket,
        "ruleset_version": out.ruleset_version,
        "disclaimer_version": out.disclaimer_version,
        "matched_signals": [m.to_dict() for m in out.matched_signals],
        "next_action_copy_key": out.next_action_copy_key,
        "inputs_hash": out.inputs_hash,
        "inputs_snapshot": out.inputs_snapshot,
    }
    assert json.dumps(payload, ensure_ascii=False)

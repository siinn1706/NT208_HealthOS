"""Pure-Python triage evaluator for the Pre-Visit Brief.

Contract (the only external surface):

    from app.services.triage_engine import evaluate, TriageInput, SymptomInput
    out = evaluate(TriageInput(symptoms=(SymptomInput(...), ...)))

The evaluator has zero I/O — no DB, no HTTP, no file system, no LLM.
This makes it cheap to fuzz, deterministic to test, and trivially safe
to wire into a request handler with sub-millisecond latency.

Design notes:

  * "Highest severity bucket wins" is implemented by evaluating buckets in
    severity order and short-circuiting on the first non-empty match list.
  * Inside a bucket, we collect every matching rule so the FE can render
    "you mentioned X, Y, and Z — that's why".
  * `inputs_hash` is a SHA-256 of the canonical JSON snapshot of the inputs.
    Lets the service layer cheaply detect "same inputs → same outcome"
    when the user re-saves without changes.
  * Free text is canonicalized (lower-cased, trimmed) before token matching,
    but the original text is preserved in the snapshot for audit.
  * The output's `next_action_copy_key` is a stable i18n key the FE renders
    — copy never travels through the engine.

STRETCH HOOK (NOT IMPLEMENTED IN MVP):
    `polish_question_text(text: str, locale: str) -> str` would call the AI
    worker behind a feature flag. Rule-based output remains primary; AI
    output is rendered as a labeled "AI-polished — please review" string.
    See plan §5.5.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from typing import Any

from app.models.visit_briefs import TRIAGE_BUCKET_SEVERITY, TriageBucketEnum
from app.services.triage_rules import (
    ALL_RULES_BY_BUCKET,
    DISCLAIMER_VERSION,
    RULESET_VERSION,
    SymptomInput,
    TriageInput,
    TriageMatch,
)

# Re-export so callers only need one import.
__all__ = [
    "DISCLAIMER_VERSION",
    "RULESET_VERSION",
    "SymptomInput",
    "TriageInput",
    "TriageMatch",
    "TriageOutput",
    "evaluate",
]


@dataclass(frozen=True)
class TriageOutput:
    bucket: str
    ruleset_version: str
    disclaimer_version: str
    matched_signals: list[TriageMatch] = field(default_factory=list)
    next_action_copy_key: str = ""
    inputs_hash: str = ""
    inputs_snapshot: dict[str, Any] = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────


def _canonical_symptom(sym: SymptomInput) -> dict[str, Any]:
    """Snapshot one symptom in a deterministic, JSON-safe shape."""
    return {
        "concern_text": (sym.concern_text or "").strip(),
        "concern_category": sym.concern_category,
        "severity_0_10": sym.severity_0_10,
        "duration_value": sym.duration_value,
        "duration_unit": sym.duration_unit,
        "onset_date": sym.onset_date.isoformat() if sym.onset_date else None,
        "triggers": (sym.triggers or "").strip() or None,
        "better_with": (sym.better_with or "").strip() or None,
        "worse_with": (sym.worse_with or "").strip() or None,
        "meds_taken": (sym.meds_taken or "").strip() or None,
        "prior_care": (sym.prior_care or "").strip() or None,
        "context": sym.context or None,
    }


def _canonical_inputs(inputs: TriageInput) -> dict[str, Any]:
    return {
        "ruleset_version": RULESET_VERSION,
        "locale": inputs.locale,
        "symptoms": [_canonical_symptom(s) for s in inputs.symptoms],
    }


def _hash_inputs(snapshot: dict[str, Any]) -> str:
    payload = json.dumps(snapshot, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _next_action_copy_key(bucket: str) -> str:
    return f"visitPrep.routing.{bucket}.next_action"


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────


def evaluate(inputs: TriageInput) -> TriageOutput:
    """Run the full ruleset over the given inputs and return a snapshot.

    Empty input (no symptoms) → `insufficient_info`. The FE renders the
    "we need more info to suggest a path" copy and keeps "Book a routine
    appointment" as the safe default CTA.
    """
    snapshot = _canonical_inputs(inputs)
    inputs_hash = _hash_inputs(snapshot)

    if not inputs.symptoms:
        return TriageOutput(
            bucket=TriageBucketEnum.INSUFFICIENT_INFO.value,
            ruleset_version=RULESET_VERSION,
            disclaimer_version=DISCLAIMER_VERSION,
            matched_signals=[],
            next_action_copy_key=_next_action_copy_key(
                TriageBucketEnum.INSUFFICIENT_INFO.value
            ),
            inputs_hash=inputs_hash,
            inputs_snapshot=snapshot,
        )

    # Highest severity bucket wins — evaluate in order and short-circuit on
    # the first non-empty bucket. Within a bucket, collect every match.
    for bucket, rules in ALL_RULES_BY_BUCKET:
        matches: list[TriageMatch] = []
        for rule in rules:
            if rule.match_fn is None:
                continue
            m = rule.match_fn(inputs)
            if m is not None:
                matches.append(m)
        if matches:
            return TriageOutput(
                bucket=bucket,
                ruleset_version=RULESET_VERSION,
                disclaimer_version=DISCLAIMER_VERSION,
                matched_signals=matches,
                next_action_copy_key=_next_action_copy_key(bucket),
                inputs_hash=inputs_hash,
                inputs_snapshot=snapshot,
            )

    # Symptoms exist but no rule fired — default to insufficient_info so the
    # safe-fallback CTA ("book a routine appointment") is shown. We never
    # leave the user without guidance.
    return TriageOutput(
        bucket=TriageBucketEnum.INSUFFICIENT_INFO.value,
        ruleset_version=RULESET_VERSION,
        disclaimer_version=DISCLAIMER_VERSION,
        matched_signals=[],
        next_action_copy_key=_next_action_copy_key(
            TriageBucketEnum.INSUFFICIENT_INFO.value
        ),
        inputs_hash=inputs_hash,
        inputs_snapshot=snapshot,
    )


def severity_of(bucket: str) -> int:
    """Public helper for callers that want to compare buckets without
    importing the underlying enum (e.g., FE-facing serializers, audit logic
    that escalates to the security log only on `urgent_same_day` and above).
    """
    return TRIAGE_BUCKET_SEVERITY.get(bucket, -1)

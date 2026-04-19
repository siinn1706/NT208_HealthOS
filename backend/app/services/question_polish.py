"""Stretch P7 — AI wording polish for question text.

**STATUS: contract only. Not implemented in MVP.**

The user-facing flow MUST keep rule-based output as the primary surface:

  1. The deterministic `triage_engine.evaluate` is the canonical source for
     routing decisions. AI never participates in routing.
  2. Question suggestions come from the seeded `question_templates` table.
     The AI hook here is purely for *rewording* an existing question — never
     for generating new questions or medical advice.
  3. Whenever a polished string is rendered, the FE labels it
     "AI-polished — please review" and gives the user one click to revert.
  4. The feature is gated by `settings.visit_brief_ai_polish` (default
     `False`). Enabling it requires a working AI worker with a confirmed
     non-medical-advice prompt.

When implemented, the function should:

  * Accept a single user-typed question string + locale.
  * Return a slightly-rewritten version of the SAME question (clearer,
    shorter), or the original string if the AI is unavailable / errors.
  * NEVER add new clinical content — the prompt should be a strict rewrite
    instruction. (e.g. "Rewrite this patient question more clearly. Do
    not add medical content. Keep the same meaning.")
  * Be cancellable + time-bounded (the AI worker stub already supports this).
  * Send only the question text — never the user's symptoms or any PHI.

The stub below intentionally raises `NotImplementedError` so any caller is
forced to gate the import behind the feature-flag check. CI lints prevent
shipping a path that calls this function with the flag unset.
"""
from __future__ import annotations

from typing import Literal


__all__ = ["polish_question_text", "PolishUnavailable"]


class PolishUnavailable(RuntimeError):
    """Raised when the AI worker cannot polish (offline, timeout, disabled).

    Callers MUST catch this and fall back to the original question text. The
    FE renders the original transparently — the user never sees a partial
    or erroring polish state.
    """


def polish_question_text(text: str, *, locale: Literal["en", "vi"]) -> str:
    """Stretch P7 — STUB. Always raises in MVP.

    See module docstring for the contract this function will fulfil when
    enabled. Until then, calling it surfaces the explicit "not implemented"
    error so accidental gating bypass is loud, not silent.
    """
    raise NotImplementedError(
        "AI wording polish is a documented stretch hook only — not implemented "
        "in MVP. Enable `settings.visit_brief_ai_polish` AND wire an AI worker "
        "endpoint before calling. See module docstring for the contract."
    )

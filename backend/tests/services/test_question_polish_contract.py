"""Lock the AI-polish stretch contract — MVP does NOT call into AI.

Plan §5.5 + user choice "ai_stretch_off": the AI wording polish stub MUST
raise NotImplementedError until the feature flag + worker integration ship.
This test guards against accidental wiring (someone importing and calling
the stub thinking it's been implemented).
"""
from __future__ import annotations

import pytest

from app.services.question_polish import (
    PolishUnavailable,
    polish_question_text,
)


def test_polish_stub_raises_not_implemented():
    with pytest.raises(NotImplementedError) as excinfo:
        polish_question_text("Should I get an X-ray?", locale="en")
    msg = str(excinfo.value)
    assert "stretch" in msg.lower()
    assert "visit_brief_ai_polish" in msg


def test_polish_unavailable_is_runtime_error_subclass():
    """`PolishUnavailable` exists so future callers can catch and fall back
    to the rule-based text without a bare except."""
    assert issubclass(PolishUnavailable, RuntimeError)

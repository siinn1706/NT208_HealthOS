"""Tests for Phase 3: event_logging helpers."""
from __future__ import annotations

import json
import logging

import pytest

from app.core.event_logging import hash_email, log_event
from app.core.logging_setup import JsonFormatter


def test_log_event_unknown_kwarg_raises_in_debug_mode(monkeypatch):
    from app.core import config as cfg
    monkeypatch.setattr(cfg.settings, "debug", True)
    with pytest.raises(ValueError, match="unsafe log fields"):
        log_event("auth", "test", "ok", raw_email="user@example.com")


def test_log_event_unknown_kwarg_dropped_in_prod(monkeypatch):
    from app.core import config as cfg
    monkeypatch.setattr(cfg.settings, "debug", False)
    # Should not raise; unknown field silently dropped
    log_event("auth", "test", "ok", raw_email="user@example.com")


def test_json_formatter_stable_keys(log_capture):
    fmt = JsonFormatter()

    handler = logging.StreamHandler()
    handler.setFormatter(fmt)

    records: list[str] = []
    class _Capture(logging.Handler):
        def emit(self, record):
            records.append(fmt.format(record))

    cap = _Capture()
    logger = logging.getLogger("healthos.events")
    logger.addHandler(cap)
    try:
        log_event("auth", "login_password", "ok", user_id="abc")
    finally:
        logger.removeHandler(cap)

    assert records, "no records emitted"
    data = json.loads(records[0])
    for key in ("ts", "level", "logger", "msg", "request_id"):
        assert key in data, f"missing key: {key}"


def test_hash_email_12_hex_chars():
    h = hash_email("User@Example.COM")
    assert h is not None
    assert len(h) == 12
    assert all(c in "0123456789abcdef" for c in h)


def test_hash_email_idempotent_case_insensitive():
    assert hash_email("user@example.com") == hash_email("USER@EXAMPLE.COM")


def test_hash_email_whitespace_insensitive():
    assert hash_email(" user@example.com ") == hash_email("user@example.com")


def test_hash_email_none_returns_none():
    assert hash_email(None) is None
    assert hash_email("") is None

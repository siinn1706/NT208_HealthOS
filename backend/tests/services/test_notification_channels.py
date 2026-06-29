"""Unit tests for the SMS/push notification channels and their provider clients.

Covers the formerly no-op `_dispatch_sms`/`_dispatch_push` stubs (now real,
config-gated) and the Twilio/Expo adapters with httpx mocked.
"""
from __future__ import annotations

import uuid

import httpx
import pytest

import app.adapters.push_client as push_client
import app.adapters.sms_client as sms_client
from app.core.config import settings
from app.services.notification_dispatch import _dispatch_push, _dispatch_sms, normalize_event


def _norm(**over):
    data = {
        "event_id": str(uuid.uuid4()),
        "recipient_id": str(uuid.uuid4()),
        "title": "T",
        "body": "B",
        "channel": "sms",
    }
    data.update(over)
    return normalize_event(data)


# ── normalize_event extracts the new target fields ───────────────────────

def test_normalize_event_extracts_phone_and_tokens():
    n = normalize_event(
        {
            "event_id": "e",
            "recipient_id": str(uuid.uuid4()),
            "title": "T",
            "body": "B",
            "channel": "sms",
            "phone": "+12025550123",
            "push_tokens": ["ExponentPushToken[abc]", "", 5],
        }
    )
    assert n.recipient_phone == "+12025550123"
    assert n.recipient_push_tokens == ["ExponentPushToken[abc]"]


# ── _dispatch_sms ────────────────────────────────────────────────────────

def test_dispatch_sms_skipped_when_unconfigured(monkeypatch):
    monkeypatch.setattr(sms_client, "is_configured", lambda: False)
    res = _dispatch_sms(_norm(channel="sms", phone="+12025550123"))
    assert res.status == "skipped" and res.reason == "provider_not_configured"


def test_dispatch_sms_skipped_when_missing_phone(monkeypatch):
    monkeypatch.setattr(sms_client, "is_configured", lambda: True)
    res = _dispatch_sms(_norm(channel="sms"))
    assert res.status == "skipped" and res.reason == "missing_recipient_phone"


def test_dispatch_sms_delivered(monkeypatch):
    monkeypatch.setattr(sms_client, "is_configured", lambda: True)
    sent = {}
    monkeypatch.setattr(sms_client, "send_sms", lambda to, body: sent.update(to=to))
    res = _dispatch_sms(_norm(channel="sms", phone="+12025550123"))
    assert res.status == "delivered" and sent["to"] == "+12025550123"


def test_dispatch_sms_failed(monkeypatch):
    monkeypatch.setattr(sms_client, "is_configured", lambda: True)

    def boom(*a, **k):
        raise RuntimeError("twilio down")

    monkeypatch.setattr(sms_client, "send_sms", boom)
    res = _dispatch_sms(_norm(channel="sms", phone="+12025550123"))
    assert res.status == "failed" and res.reason == "RuntimeError"


# ── _dispatch_push ───────────────────────────────────────────────────────

def test_dispatch_push_skipped_when_unconfigured(monkeypatch):
    monkeypatch.setattr(push_client, "is_configured", lambda: False)
    res = _dispatch_push(_norm(channel="push", push_tokens=["t"]))
    assert res.status == "skipped" and res.reason == "provider_not_configured"


def test_dispatch_push_skipped_when_no_token(monkeypatch):
    monkeypatch.setattr(push_client, "is_configured", lambda: True)
    res = _dispatch_push(_norm(channel="push"))
    assert res.status == "skipped" and res.reason == "no_device_token"


def test_dispatch_push_delivered(monkeypatch):
    monkeypatch.setattr(push_client, "is_configured", lambda: True)
    sent = {}
    monkeypatch.setattr(push_client, "send_push", lambda tokens, title, body: sent.update(n=len(tokens)))
    res = _dispatch_push(_norm(channel="push", push_tokens=["ExponentPushToken[a]"]))
    assert res.status == "delivered" and sent["n"] == 1


# ── Twilio sms_client ────────────────────────────────────────────────────

def test_sms_client_raises_when_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "twilio_account_sid", None)
    assert sms_client.is_configured() is False
    with pytest.raises(RuntimeError):
        sms_client.send_sms("+12025550123", "hi")


def test_sms_client_posts_to_twilio(monkeypatch):
    monkeypatch.setattr(settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(settings, "twilio_auth_token", "tok")
    monkeypatch.setattr(settings, "twilio_from_number", "+1999")
    calls = {}

    class FakeResp:
        def raise_for_status(self):
            calls["raised"] = True

    def fake_post(url, **kw):
        calls["url"] = url
        calls["kw"] = kw
        return FakeResp()

    monkeypatch.setattr(httpx, "post", fake_post)
    sms_client.send_sms("+12025550123", "hello")
    assert "AC123" in calls["url"]
    assert calls["kw"]["data"]["To"] == "+12025550123"
    assert calls["kw"]["data"]["From"] == "+1999"
    assert calls["kw"]["auth"] == ("AC123", "tok")
    assert calls["raised"] is True


# ── Expo push_client ─────────────────────────────────────────────────────

def test_push_client_raises_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "expo_push_enabled", False)
    with pytest.raises(RuntimeError):
        push_client.send_push(["t"], "T", "B")


def test_push_client_requires_tokens(monkeypatch):
    monkeypatch.setattr(settings, "expo_push_enabled", True)
    with pytest.raises(ValueError):
        push_client.send_push([], "T", "B")


def test_push_client_posts_to_expo(monkeypatch):
    monkeypatch.setattr(settings, "expo_push_enabled", True)
    monkeypatch.setattr(settings, "expo_access_token", None)
    calls = {}

    class FakeResp:
        def raise_for_status(self):
            pass

    def fake_post(url, **kw):
        calls["url"] = url
        calls["json"] = kw.get("json")
        return FakeResp()

    monkeypatch.setattr(httpx, "post", fake_post)
    push_client.send_push(["ExponentPushToken[a]", "ExponentPushToken[b]"], "T", "B")
    assert calls["url"] == "https://exp.host/--/api/v2/push/send"
    assert len(calls["json"]) == 2
    assert calls["json"][0]["to"] == "ExponentPushToken[a]"

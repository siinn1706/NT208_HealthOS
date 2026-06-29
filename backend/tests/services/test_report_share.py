"""Unit tests for the report-share service (email i18n, PDF attach, SMS, fan-out).

All async functions are driven via ``asyncio.run`` so the suite needs no real DB
and no pytest-asyncio plugin. External I/O (SMTP, Twilio, PDF render) is mocked.
"""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

import pytest

from app.schemas.report_share import ShareRecipient, ShareReportRequest
from app.services import report_share


# ── Fakes ────────────────────────────────────────────────────────────────

class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeAsyncDb:
    """Minimal async-session stand-in for the report-share service."""

    def __init__(self, rows=None):
        self._rows = rows or []
        self.added = []
        self.flushed = False

    async def execute(self, *args, **kwargs):
        return _FakeResult(self._rows)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushed = True


def _sharer(display_name="Dr. An", username="dran"):
    return SimpleNamespace(id=uuid.uuid4(), display_name=display_name, username=username)


def _recipient(**over):
    data = {"name": "Bob", "email": "bob@example.com"}
    data.update(over)
    return ShareRecipient(**data)


def _request(**over):
    data = {"report_id": "report-7d-x", "recipients": [_recipient()], "channels": ["email"]}
    data.update(over)
    return ShareReportRequest(**data)


# ── i18n / compose ───────────────────────────────────────────────────────

def test_t_falls_back_to_vi_for_unknown_locale():
    assert report_share._t("xx", "greeting") == report_share._STRINGS["vi"]["greeting"]


def test_compose_email_vi_vs_en():
    subj_vi, body_vi = report_share._compose_email("An", "ghi chú test", "vi", with_pdf=False)
    assert "An" in subj_vi and "chia sẻ" in subj_vi
    assert "Lời nhắn:" in body_vi and "ghi chú test" in body_vi

    subj_en, body_en = report_share._compose_email("An", "take a look", "en", with_pdf=True)
    assert "shared a health report" in subj_en
    assert "Message:" in body_en and "attached as a PDF" in body_en


def test_compose_email_pdf_note_only_when_with_pdf():
    _, body_no = report_share._compose_email("An", None, "vi", with_pdf=False)
    _, body_yes = report_share._compose_email("An", None, "vi", with_pdf=True)
    assert "đính kèm" not in body_no
    assert "đính kèm" in body_yes


def test_compose_in_app_and_sms_localized():
    title_vi, body_vi = report_share._compose_in_app("An", "ghi chú", "vi")
    assert title_vi == report_share._STRINGS["vi"]["in_app_title"]
    assert "ghi chú" in body_vi
    assert "shared a health report" in report_share._compose_sms("An", None, "en")


# ── email delivery ───────────────────────────────────────────────────────

def test_deliver_email_skipped_when_smtp_off():
    res = asyncio.run(report_share._deliver_email(_recipient(), False, "s", "b", None))
    assert res.status == "skipped" and res.error_message == "email_not_configured"


def test_deliver_email_sent_passes_attachments(monkeypatch):
    captured = {}

    def fake_send(to, subject, text, html, attachments):
        captured.update(to=to, attachments=attachments)

    monkeypatch.setattr(report_share.email_client, "send_email", fake_send)
    atts = [("report.pdf", b"%PDF", "application", "pdf")]
    res = asyncio.run(report_share._deliver_email(_recipient(), True, "s", "b", atts))
    assert res.status == "sent"
    assert captured["to"] == "bob@example.com"
    assert captured["attachments"] == atts


def test_deliver_email_failed_on_exception(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(report_share.email_client, "send_email", boom)
    res = asyncio.run(report_share._deliver_email(_recipient(), True, "s", "b", None))
    assert res.status == "failed" and res.error_message == "send_failed"


# ── SMS delivery ─────────────────────────────────────────────────────────

def test_deliver_sms_skipped_when_unconfigured():
    res = asyncio.run(report_share._deliver_sms(_recipient(phone="+12025550123"), False, "hi"))
    assert res.status == "skipped" and res.error_message == "sms_not_configured"


def test_deliver_sms_skipped_when_no_phone():
    res = asyncio.run(report_share._deliver_sms(_recipient(), True, "hi"))
    assert res.status == "skipped" and res.error_message == "missing_phone"


def test_deliver_sms_sent(monkeypatch):
    sent = {}
    monkeypatch.setattr(report_share.sms_client, "send_sms", lambda to, body: sent.update(to=to, body=body))
    res = asyncio.run(report_share._deliver_sms(_recipient(phone="+12025550123"), True, "hi"))
    assert res.status == "sent" and sent["to"] == "+12025550123"


# ── share_report fan-out ─────────────────────────────────────────────────

def test_share_report_fans_out_all_channels(monkeypatch):
    reg_email = "bob@example.com"
    db = _FakeAsyncDb(rows=[(uuid.uuid4(), reg_email)])
    monkeypatch.setattr(report_share, "_smtp_ready", lambda: True)
    monkeypatch.setattr(report_share.sms_client, "is_configured", lambda: True)
    monkeypatch.setattr(report_share.email_client, "send_email", lambda *a, **k: None)
    monkeypatch.setattr(report_share.sms_client, "send_sms", lambda *a, **k: None)

    req = _request(
        recipients=[_recipient(email=reg_email, phone="+12025550123")],
        channels=["email", "in_app", "sms"],
    )
    results = asyncio.run(report_share.share_report(db, _sharer(), req))
    by_channel = {r.channel: r.status for r in results}
    assert by_channel == {"email": "sent", "in_app": "sent", "sms": "sent"}
    assert db.flushed is True and len(db.added) == 1


def test_share_report_in_app_skips_unregistered(monkeypatch):
    db = _FakeAsyncDb(rows=[])
    monkeypatch.setattr(report_share, "_smtp_ready", lambda: True)
    req = _request(channels=["in_app"])
    results = asyncio.run(report_share.share_report(db, _sharer(), req))
    assert results[0].channel == "in_app"
    assert results[0].status == "skipped"
    assert results[0].error_message == "recipient_not_registered"


def test_share_report_attaches_pdf_when_requested(monkeypatch):
    db = _FakeAsyncDb(rows=[])
    captured = {}
    monkeypatch.setattr(report_share, "_smtp_ready", lambda: True)
    monkeypatch.setattr(
        report_share.email_client, "send_email",
        lambda to, subj, text, html, atts: captured.update(atts=atts),
    )

    async def fake_pdf(*a, **k):
        return b"%PDF-1.4 fake"

    monkeypatch.setattr(report_share, "_render_report_pdf", fake_pdf)
    req = _request(channels=["email"], include_pdf=True, period="30d")
    results = asyncio.run(report_share.share_report(db, _sharer(), req))
    assert results[0].status == "sent"
    assert captured["atts"][0][0] == "healthos-report-30d.pdf"
    assert captured["atts"][0][1] == b"%PDF-1.4 fake"


def test_share_report_pdf_degrades_when_render_unavailable(monkeypatch):
    db = _FakeAsyncDb(rows=[])
    captured = {}
    monkeypatch.setattr(report_share, "_smtp_ready", lambda: True)
    monkeypatch.setattr(
        report_share.email_client, "send_email",
        lambda to, subj, text, html, atts: captured.update(atts=atts),
    )

    async def no_pdf(*a, **k):
        return None

    monkeypatch.setattr(report_share, "_render_report_pdf", no_pdf)
    req = _request(channels=["email"], include_pdf=True)
    results = asyncio.run(report_share.share_report(db, _sharer(), req))
    assert results[0].status == "sent"
    assert captured["atts"] is None  # email still sent, just without the PDF


# ── schema validation ────────────────────────────────────────────────────

def test_schema_rejects_invalid_email():
    with pytest.raises(ValueError):
        ShareRecipient(name="x", email="not-an-email")


def test_schema_normalizes_and_validates_phone():
    ok = ShareRecipient(name="x", email="a@b.com", phone="  +1 202-555-0123 ")
    assert ok.phone == "+1 202-555-0123"
    assert ShareRecipient(name="x", email="a@b.com", phone="   ").phone is None
    with pytest.raises(ValueError):
        ShareRecipient(name="x", email="a@b.com", phone="abc")


def test_schema_request_defaults_and_channel_literal():
    req = _request()
    assert req.period == "7d" and req.locale == "vi" and req.include_pdf is False
    with pytest.raises(ValueError):
        _request(channels=["pager"])

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app


def _payload(**overrides):
    data = {
        "event_id": str(uuid.uuid4()),
        "recipient_id": str(uuid.uuid4()),
        "email": "demo@example.com",
        "title": "Demo notification",
        "body": "Your demo notification is ready.",
        "channel": "email",
    }
    data.update(overrides)
    return data


def test_dispatch_sends_email_when_smtp_is_configured(monkeypatch):
    sent_messages = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            self.host = host
            self.port = port
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            return None

        def login(self, user, password):
            return None

        def send_message(self, message):
            sent_messages.append(message)

    monkeypatch.setenv("SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("SMTP_PORT", "2525")
    monkeypatch.setenv("SMTP_FROM", "noreply@example.test")
    monkeypatch.setattr("app.notification_dispatch_core.smtplib.SMTP", FakeSMTP)

    response = TestClient(app).post("/dispatch", json=_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "delivered"
    assert body["channel"] == "email"
    assert body["results"] == [{"channel": "email", "status": "delivered"}]
    assert len(sent_messages) == 1


def test_dispatch_rejects_invalid_payload():
    response = TestClient(app).post(
        "/dispatch",
        json={"event_id": str(uuid.uuid4()), "channel": "email"},
    )

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_ENVELOPE"


def test_dispatch_skips_unsupported_channel():
    response = TestClient(app).post("/dispatch", json=_payload(channel="pager"))

    assert response.status_code == 200
    assert response.json() == {
        "event_id": response.json()["event_id"],
        "status": "skipped",
        "results": [{"channel": "pager", "status": "skipped", "reason": "unsupported_channel"}],
        "channel": "pager",
        "reason": "unsupported_channel",
    }

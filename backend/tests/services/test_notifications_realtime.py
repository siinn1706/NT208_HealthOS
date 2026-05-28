from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest

from app.services import notifications as notif_svc
from app.services import notification_dispatch


class FakeWsManager:
    def __init__(self) -> None:
        self.sent: list[tuple[str, dict]] = []

    async def send_to_user(self, user_id: str, frame: dict) -> None:
        self.sent.append((user_id, frame))


@pytest.mark.asyncio
async def test_emit_notification_created_targets_owner_room(monkeypatch):
    fake_manager = FakeWsManager()
    monkeypatch.setattr(notif_svc, "ws_manager", fake_manager)
    user_id = uuid.uuid4()
    notification_id = uuid.uuid4()
    notification = SimpleNamespace(
        id=notification_id,
        user_id=user_id,
        kind="info",
        created_at=datetime.datetime(2026, 5, 28, tzinfo=datetime.timezone.utc),
    )

    await notif_svc.emit_notification_created(notification)

    assert fake_manager.sent == [
        (
            str(user_id),
            {
                "event": "notification.created",
                "payload": {
                    "id": str(notification_id),
                    "kind": "info",
                    "created_at": "2026-05-28T00:00:00+00:00",
                },
                "timestamp": fake_manager.sent[0][1]["timestamp"],
            },
        )
    ]


def test_dispatch_with_external_db_does_not_emit_before_external_commit(monkeypatch):
    emitted = []
    monkeypatch.setattr(notification_dispatch, "_emit_in_app_realtime", emitted.append)

    class FakeDb:
        def add(self, obj):
            self.obj = obj

        def flush(self):
            self.obj.id = uuid.uuid4()
            self.obj.created_at = datetime.datetime(2026, 5, 28, tzinfo=datetime.timezone.utc)

    result = notification_dispatch.dispatch(
        {
            "event_id": str(uuid.uuid4()),
            "recipient_id": str(uuid.uuid4()),
            "title": "Commit-owned notification",
            "body": "Caller owns this transaction.",
            "channel": "in_app",
        },
        db=FakeDb(),
    )

    assert result.status == "delivered"
    assert emitted == []

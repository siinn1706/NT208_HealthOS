from __future__ import annotations

import uuid

from app.services.notification_dispatch import dispatch
from app.tasks.notification_dispatch import dispatch_notification


class FakeDb:
    def __init__(self):
        self.added = []
        self.flushed = False

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        self.flushed = True


def _payload(**overrides):
    data = {
        "event_id": str(uuid.uuid4()),
        "recipient_id": str(uuid.uuid4()),
        "title": "Demo notification",
        "body": "Your demo notification is ready.",
        "channel": "in_app",
    }
    data.update(overrides)
    return data


def test_dispatch_persists_in_app_notification_with_injected_db():
    db = FakeDb()

    result = dispatch(_payload(), db=db).to_dict()

    assert result["status"] == "delivered"
    assert result["channel"] == "in_app"
    assert db.flushed is True
    assert len(db.added) == 1
    assert db.added[0].title == "Demo notification"


def test_dispatch_skips_unsupported_channel_without_crashing():
    result = dispatch(_payload(channel="pager")).to_dict()

    assert result["status"] == "skipped"
    assert result["channel"] == "pager"
    assert result["reason"] == "unsupported_channel"


def test_celery_notification_task_does_not_raise_not_implemented():
    result = dispatch_notification.run(_payload(channel="pager"))

    assert result["status"] == "skipped"
    assert result["reason"] == "unsupported_channel"

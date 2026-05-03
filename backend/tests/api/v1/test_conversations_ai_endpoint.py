"""Contract checks for POST /v1/conversations/ai."""
from __future__ import annotations

import datetime
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.api.v1.endpoints import conversations as conv_ep
from app.core.security import get_current_user
from app.main import app


def _conversation_payload() -> dict:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "type": "ai",
        "title": "HealthOS AI Assistant",
        "avatar_url": None,
        "participants": [],
        "last_message": None,
        "unread_count": 0,
        "is_muted": False,
        "is_pinned": False,
        "theme_id": None,
        "created_at": now,
        "updated_at": now,
    }


@pytest_asyncio.fixture
async def authed_client():
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "chat-ai@local", "hashed_password": "x"},
    )()

    async def override_current_user():
        return fake_user

    app.dependency_overrides[get_current_user] = override_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, fake_user
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_ai_conversation_allows_empty_body(authed_client, monkeypatch):
    client, fake_user = authed_client

    class _FakeDb:
        def __init__(self):
            self.commit_calls = 0

        async def commit(self):
            self.commit_calls += 1

    db = _FakeDb()

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    called: dict[str, object] = {}

    async def fake_get_or_create_ai_conversation(*, db, user_id, initial_message=None, presence_map=None):
        called["db"] = db
        called["user_id"] = user_id
        called["initial_message"] = initial_message
        called["presence_map"] = presence_map
        return _conversation_payload()

    monkeypatch.setattr(conv_ep.chat_svc, "get_or_create_ai_conversation", fake_get_or_create_ai_conversation)
    try:
        res = await client.post("/v1/conversations/ai")
        assert res.status_code == 201
        assert res.json()["data"]["type"] == "ai"
        assert called["db"] is db
        assert called["user_id"] == fake_user.id
        assert called["initial_message"] is None
        assert isinstance(called["presence_map"], dict)
        assert db.commit_calls == 1
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_create_ai_conversation_accepts_initial_message(authed_client, monkeypatch):
    client, fake_user = authed_client

    class _FakeDb:
        def __init__(self):
            self.commit_calls = 0

        async def commit(self):
            self.commit_calls += 1

    db = _FakeDb()

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    called: dict[str, object] = {}

    async def fake_get_or_create_ai_conversation(*, db, user_id, initial_message=None, presence_map=None):
        called["db"] = db
        called["user_id"] = user_id
        called["initial_message"] = initial_message
        called["presence_map"] = presence_map
        return _conversation_payload()

    monkeypatch.setattr(conv_ep.chat_svc, "get_or_create_ai_conversation", fake_get_or_create_ai_conversation)
    try:
        res = await client.post(
            "/v1/conversations/ai",
            json={"initial_message": "Summarize my health this week"},
        )
        assert res.status_code == 201
        assert res.json()["data"]["type"] == "ai"
        assert called["db"] is db
        assert called["user_id"] == fake_user.id
        assert called["initial_message"] == "Summarize my health this week"
        assert isinstance(called["presence_map"], dict)
        assert db.commit_calls == 1
    finally:
        app.dependency_overrides.pop(get_db, None)

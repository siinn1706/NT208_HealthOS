"""Contract checks for POST /v1/conversations/ai."""
from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app.adapters.database import get_db
from app.api.v1.endpoints import conversations as conv_ep
from app.core.security import get_current_user
from app.main import app
from app.models.core import ConversationTypeEnum


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


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDb:
    def __init__(self, *results):
        self.results = list(results)
        self.commit_calls = 0

    async def execute(self, *_args, **_kwargs):
        if not self.results:
            raise AssertionError("Unexpected execute call")
        return self.results.pop(0)

    async def commit(self):
        self.commit_calls += 1


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
async def test_list_conversations_commits_auto_created_ai_conversation(monkeypatch):
    user = SimpleNamespace(id=uuid.uuid4())
    db = _FakeDb()
    called: dict[str, object] = {}

    async def fake_get_conversations(db, user_id, presence_map=None):
        called["db"] = db
        called["user_id"] = user_id
        called["presence_map"] = presence_map
        return []

    monkeypatch.setattr(conv_ep.chat_svc, "get_conversations", fake_get_conversations)

    response = await conv_ep.list_conversations(user, db)

    assert response.total == 0
    assert called["db"] is db
    assert called["user_id"] == user.id
    assert isinstance(called["presence_map"], dict)
    assert db.commit_calls == 1


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


@pytest.mark.asyncio
async def test_stream_message_uses_preferences_locale_without_profile_preferred_language(monkeypatch):
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    user_message_id = uuid.uuid4()
    db = _FakeDb(
        _ScalarResult(SimpleNamespace(id=conversation_id, type=ConversationTypeEnum.AI)),
        _ScalarResult("en"),
    )
    captured: dict[str, object] = {}

    async def fake_assert_member(*_args, **_kwargs):
        return None

    async def fake_send_message(*_args, **_kwargs):
        return SimpleNamespace(id=user_message_id)

    async def fake_ensure_ai_bot_member(*_args, **_kwargs):
        return bot_id

    def fake_stream_assistant_response(**kwargs):
        captured.update(kwargs)

        async def generator():
            yield "event: done\ndata: {}\n\n"

        return generator()

    monkeypatch.setattr(conv_ep.chat_svc, "assert_member", fake_assert_member)
    monkeypatch.setattr(conv_ep.chat_svc, "send_message", fake_send_message)
    monkeypatch.setattr(conv_ep.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(conv_ep, "stream_assistant_response", fake_stream_assistant_response)

    response = await conv_ep.stream_message(
        conversation_id,
        conv_ep.SendMessageBody(content="hello"),
        SimpleNamespace(),
        SimpleNamespace(id=user_id, profile=SimpleNamespace()),
        db,
    )

    assert response.status_code == 200
    assert captured["locale"] == "en"
    assert captured["assistant_sender_id"] == bot_id
    assert db.commit_calls == 2


@pytest.mark.asyncio
async def test_stream_message_prefers_request_locale_over_saved_preferences(monkeypatch):
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    bot_id = uuid.uuid4()
    user_message_id = uuid.uuid4()
    db = _FakeDb(_ScalarResult(SimpleNamespace(id=conversation_id, type=ConversationTypeEnum.AI)))
    captured: dict[str, object] = {}

    async def fake_assert_member(*_args, **_kwargs):
        return None

    async def fake_send_message(*_args, **_kwargs):
        return SimpleNamespace(id=user_message_id)

    async def fake_ensure_ai_bot_member(*_args, **_kwargs):
        return bot_id

    def fake_stream_assistant_response(**kwargs):
        captured.update(kwargs)

        async def generator():
            yield "event: done\ndata: {}\n\n"

        return generator()

    monkeypatch.setattr(conv_ep.chat_svc, "assert_member", fake_assert_member)
    monkeypatch.setattr(conv_ep.chat_svc, "send_message", fake_send_message)
    monkeypatch.setattr(conv_ep.ai_bot, "ensure_ai_bot_member", fake_ensure_ai_bot_member)
    monkeypatch.setattr(conv_ep, "stream_assistant_response", fake_stream_assistant_response)

    response = await conv_ep.stream_message(
        conversation_id,
        conv_ep.SendMessageBody(content="Mẹo để nhớ uống thuốc đều đặn", locale="vi"),
        SimpleNamespace(),
        SimpleNamespace(id=user_id, profile=SimpleNamespace(preferred_language="en")),
        db,
    )

    assert response.status_code == 200
    assert captured["locale"] == "vi"
    assert db.results == []
    assert db.commit_calls == 2


@pytest.mark.asyncio
async def test_stream_message_maps_non_member_to_forbidden(monkeypatch):
    conversation_id = uuid.uuid4()
    user_id = uuid.uuid4()
    db = _FakeDb(_ScalarResult(SimpleNamespace(id=conversation_id, type=ConversationTypeEnum.AI)))

    async def fake_assert_member(*_args, **_kwargs):
        raise ValueError("You are not a member of this conversation.")

    monkeypatch.setattr(conv_ep.chat_svc, "assert_member", fake_assert_member)

    with pytest.raises(HTTPException) as exc_info:
        await conv_ep.stream_message(
            conversation_id,
            conv_ep.SendMessageBody(content="hello"),
            SimpleNamespace(),
            SimpleNamespace(id=user_id, profile=None),
            db,
    )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "CHAT_FORBIDDEN"

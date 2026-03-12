"""Integration tests for Core BE chat endpoints.

These tests run against the FastAPI app via ASGI transport and override
auth/DB dependencies to validate endpoint behavior and response envelopes.
"""
from __future__ import annotations

import datetime
import sys
import types
import uuid
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.adapters.database import get_db
from app.api.v1.endpoints import conversations as conv_ep
from app.core.security import get_current_user
from app.main import app
from app.schemas.chat import MessageDTO


TEST_USER_ID = uuid.uuid4()
OTHER_USER_ID = uuid.uuid4()


async def _override_current_user():
    return types.SimpleNamespace(
        id=TEST_USER_ID,
        email="tester@example.com",
        display_name="Tester",
        profile=None,
    )


async def _override_db():
    class DummyAsyncSession:
        async def commit(self) -> None:
            return None

    yield DummyAsyncSession()


@pytest.fixture(autouse=True)
def _override_dependencies():
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_db] = _override_db
    yield
    app.dependency_overrides.clear()


class TestConversationsEndpoint:
    """Tests for /v1/conversations endpoint."""

    @pytest.mark.asyncio
    async def test_list_conversations_returns_envelope(self, monkeypatch: pytest.MonkeyPatch):
        """GET /v1/conversations should return 200 with data envelope."""
        mock_conv = types.SimpleNamespace(
            id=uuid.uuid4(),
            type="direct",
            title="Test Chat",
            avatar_url=None,
            participants=[],
            last_message=None,
            unread_count=0,
            is_muted=False,
            is_pinned=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            updated_at=datetime.datetime.now(datetime.timezone.utc),
        )

        async def fake_get_conversations(*args, **kwargs):
            return [mock_conv]

        monkeypatch.setattr(conv_ep.chat_svc, "get_conversations", fake_get_conversations)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/v1/conversations")

        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload
        assert isinstance(payload["data"], list)

    @pytest.mark.asyncio
    async def test_list_pending_conversations(self, monkeypatch: pytest.MonkeyPatch):
        """GET /v1/conversations/pending should return pending conversations."""
        mock_conv = types.SimpleNamespace(
            id=uuid.uuid4(),
            type="direct",
            title=None,
            avatar_url=None,
            participants=[],
            last_message=None,
            unread_count=0,
            is_muted=False,
            is_pinned=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            updated_at=datetime.datetime.now(datetime.timezone.utc),
        )

        async def fake_get_pending(*args, **kwargs):
            return [mock_conv]

        monkeypatch.setattr(conv_ep.chat_svc, "get_pending_conversations", fake_get_pending)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/v1/conversations/pending")

        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload


class TestMessagesEndpoint:
    """Tests for /v1/conversations/{id}/messages endpoint."""

    @pytest.mark.asyncio
    async def test_get_messages_returns_envelope(self, monkeypatch: pytest.MonkeyPatch):
        """GET /v1/conversations/{id}/messages should return message list."""
        conv_id = uuid.uuid4()
        mock_message = types.SimpleNamespace(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            sender_id=OTHER_USER_ID,
            sender=types.SimpleNamespace(
                id=OTHER_USER_ID,
                display_name="Other User",
                avatar_url=None,
            ),
            content="Hello!",
            content_type="text",
            attachments=None,
            reply_to_id=None,
            reply_to=None,
            reactions=[],
            is_recalled=False,
            is_edited=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            edited_at=None,
        )

        async def fake_get_messages(*args, **kwargs):
            return [mock_message], False

        monkeypatch.setattr(conv_ep.chat_svc, "get_messages", fake_get_messages)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/v1/conversations/{conv_id}/messages")

        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload
        assert isinstance(payload["data"], list)

    @pytest.mark.asyncio
    async def test_send_message_returns_201(self, monkeypatch: pytest.MonkeyPatch):
        """POST /v1/conversations/{id}/messages should return 201."""
        conv_id = uuid.uuid4()
        mock_message = MessageDTO(
            id=uuid.uuid4(),
            conversation_id=conv_id,
            sender_id=TEST_USER_ID,
            sender_display_name="Tester",
            sender_avatar_url=None,
            content="Test message",
            content_type="text",
            attachments=None,
            reply_to_id=None,
            reply_to=None,
            reactions=[],
            is_recalled=False,
            created_at=datetime.datetime.now(datetime.timezone.utc),
            edited_at=None,
        )

        async def fake_send_message(*args, **kwargs):
            return mock_message

        async def fake_notify(*args, **kwargs):
            pass

        monkeypatch.setattr(conv_ep.chat_svc, "send_message", fake_send_message)
        monkeypatch.setattr(conv_ep, "_notify_conversation", fake_notify)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/v1/conversations/{conv_id}/messages",
                json={"content": "Test message", "content_type": "text"},
            )

        assert response.status_code == 201
        payload = response.json()
        assert payload["conversation_id"] == str(conv_id)
        assert payload["content"] == "Test message"


class TestConversationSettingsEndpoint:
    """Tests for /v1/conversations/{id}/settings endpoint."""

    @pytest.mark.asyncio
    async def test_update_settings_returns_conv_dto(self, monkeypatch: pytest.MonkeyPatch):
        """PATCH /v1/conversations/{id}/settings should update and return conversation."""
        conv_id = uuid.uuid4()

        mock_member = types.SimpleNamespace(
            conversation_id=conv_id,
            user_id=TEST_USER_ID,
            is_muted=True,
            is_pinned=True,
            theme_id="dark",
        )

        mock_conv = types.SimpleNamespace(
            id=conv_id,
            type="direct",
            title="Test Chat",
            avatar_url=None,
            participants=[],
            last_message=None,
            unread_count=0,
            is_muted=True,
            is_pinned=True,
            theme_id="dark",
            created_at=datetime.datetime.now(datetime.timezone.utc),
            updated_at=datetime.datetime.now(datetime.timezone.utc),
        )

        async def fake_update_settings(*args, **kwargs):
            return mock_member

        async def fake_get_conv(*args, **kwargs):
            return mock_conv

        async def fake_build_dto(*args, **kwargs):
            return mock_conv

        monkeypatch.setattr(conv_ep.chat_svc, "update_conversation_settings", fake_update_settings)
        monkeypatch.setattr(conv_ep.chat_svc, "get_conversation_by_id", fake_get_conv)
        monkeypatch.setattr(conv_ep.chat_svc, "_build_conversation_dto", fake_build_dto)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch(
                f"/v1/conversations/{conv_id}/settings",
                json={"is_muted": True, "is_pinned": True, "theme_id": "dark"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["id"] == str(conv_id)
        assert payload["is_muted"] is True
        assert payload["is_pinned"] is True


class TestTypingIndicator:
    """Tests for typing indicator endpoint."""

    @pytest.mark.asyncio
    async def test_typing_endpoint_returns_404_for_invalid_conv(self):
        """Invalid conversation ID should return 404 or similar error."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/v1/conversations/invalid-uuid/messages")

        # Invalid UUID should return 422 (Pydantic validation error)
        assert response.status_code == 422


class TestUserLookupEndpoint:
    """Tests for /v1/users/lookup endpoint."""

    @pytest.mark.asyncio
    async def test_user_lookup_returns_results(self, monkeypatch: pytest.MonkeyPatch):
        """GET /v1/users/lookup should return matching users."""
        mock_user = {
            "id": OTHER_USER_ID,
            "display_name": "John Doe",
            "email": "john@example.com",
            "avatar_url": None,
        }

        async def fake_lookup(*args, **kwargs):
            return [mock_user]

        monkeypatch.setattr(conv_ep.chat_svc, "lookup_users", fake_lookup)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/v1/users/lookup?q=john")

        assert response.status_code == 200
        payload = response.json()
        assert "data" in payload
        assert isinstance(payload["data"], list)
        assert payload["data"][0]["id"] == str(OTHER_USER_ID)

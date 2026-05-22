"""Cross-user IDOR tests — WebSocket events.

Asserts that a non-member user_b cannot perform chat actions on user_a's conversations.
Uses Starlette's built-in TestClient.websocket_connect (no extra deps).

NOTE: WS tests cannot use the SAVEPOINT-isolated `db` fixture because the WS
handler opens its own AsyncSessionLocal() connection, which would not see data
written in an uncommitted SAVEPOINT. Instead, these tests use a fully-committed
session (`ws_db`) with manual cleanup.
"""
from __future__ import annotations

import datetime
import json
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.testclient import TestClient

from app.core.config import settings as app_settings
from app.core.security import create_ws_ticket
from app.main import app
from app.models.core import (
    Conversation,
    ConversationMember,
    ConversationTypeEnum,
    Message,
    MessageContentTypeEnum,
    User,
)
from tests.conftest import make_user

_NOW = datetime.datetime.now(datetime.timezone.utc)


# ── Session that fully commits (needed for WS handler to see data) ─────────────
@pytest_asyncio.fixture()
async def ws_db():
    """A committed-session fixture for WS tests. Manually tracks IDs for cleanup."""
    engine = create_async_engine(app_settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    cleanup_ids: list[tuple[type, uuid.UUID]] = []

    async with session_factory() as session:
        yield session, cleanup_ids
        # Cleanup in reverse insertion order
        for model_cls, row_id in reversed(cleanup_ids):
            obj = await session.get(model_cls, row_id)
            if obj is not None:
                await session.delete(obj)
        await session.commit()

    await engine.dispose()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _setup_ws_scenario(ws_db) -> tuple[User, User, Conversation, Message]:
    """Create two users, a conversation owned by user_a, and a message. Returns committed data."""
    session, cleanup_ids = ws_db

    ua = make_user("ws_a")
    ub = make_user("ws_b")
    session.add(ua)
    session.add(ub)
    await session.flush()

    conv = Conversation(
        id=uuid.uuid4(),
        type=ConversationTypeEnum.GROUP,
        title="WS Test Conv",
        created_by=ua.id,
    )
    session.add(conv)
    await session.flush()

    member = ConversationMember(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        user_id=ua.id,
        role="owner",
        is_accepted=True,
    )
    session.add(member)

    msg = Message(
        id=uuid.uuid4(),
        conversation_id=conv.id,
        sender_id=ua.id,
        content="hello",
        content_type=MessageContentTypeEnum.TEXT,
        is_recalled=False,
        status="completed",
        created_at=_NOW,
    )
    session.add(msg)
    await session.commit()

    # Register for cleanup (order matters)
    cleanup_ids.extend([
        (Message, msg.id),
        (ConversationMember, member.id),
        (Conversation, conv.id),
        (User, ub.id),
        (User, ua.id),
    ])
    return ua, ub, conv, msg


def _ws_send_recv(ws_client, event: str, payload: dict) -> dict:
    ws_client.send_text(json.dumps({"event": event, "payload": payload}))
    raw = ws_client.receive_text()
    return json.loads(raw)


def _assert_chat_forbidden(response: dict, event: str) -> None:
    assert response.get("event") in ("chat.error", "error"), (
        f"{event}: expected error frame, got {response.get('event')!r}"
    )
    code = response.get("payload", {}).get("code", "")
    assert "FORBIDDEN" in code or "INVALID" in code or "NOT_MEMBER" in code, (
        f"{event}: expected FORBIDDEN-family code, got {code!r}"
    )


# ── WS non-member denial tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ws_msg_send_non_member_forbidden(ws_db):
    _, user_b, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:send", {
            "conversation_id": str(conv.id),
            "content": "intruder message",
            "content_type": "text",
        })
        _assert_chat_forbidden(resp, "msg:send")


@pytest.mark.asyncio
async def test_ws_msg_edit_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:edit", {
            "conversation_id": str(conv.id),
            "message_id": str(msg.id),
            "new_content": "hacked",
        })
        _assert_chat_forbidden(resp, "msg:edit")


@pytest.mark.asyncio
async def test_ws_msg_delete_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:delete", {
            "conversation_id": str(conv.id),
            "message_id": str(msg.id),
        })
        _assert_chat_forbidden(resp, "msg:delete")


@pytest.mark.asyncio
async def test_ws_msg_read_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:read", {
            "conversation_id": str(conv.id),
            "last_message_id": str(msg.id),
        })
        _assert_chat_forbidden(resp, "msg:read")


@pytest.mark.asyncio
async def test_ws_msg_react_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:react", {
            "conversation_id": str(conv.id),
            "message_id": str(msg.id),
            "emoji": "👍",
        })
        _assert_chat_forbidden(resp, "msg:react")


@pytest.mark.asyncio
async def test_ws_msg_pin_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:pin", {
            "conversation_id": str(conv.id),
            "message_id": str(msg.id),
        })
        _assert_chat_forbidden(resp, "msg:pin")


@pytest.mark.asyncio
async def test_ws_msg_unpin_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "msg:unpin", {
            "conversation_id": str(conv.id),
            "message_id": str(msg.id),
        })
        _assert_chat_forbidden(resp, "msg:unpin")


@pytest.mark.asyncio
async def test_ws_conv_sync_non_member_forbidden(ws_db):
    _, user_b, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    with TestClient(app).websocket_connect(f"/ws?token={ticket_b}") as ws:
        resp = _ws_send_recv(ws, "conv:sync", {
            "conversation_id": str(conv.id),
            "before_message_id": None,
            "limit": 20,
        })
        _assert_chat_forbidden(resp, "conv:sync")


# ── Group conv auto-accept regression tests (Phase 3 finding) ────────────────

@pytest.mark.asyncio
async def test_group_conv_require_accept_non_creator_starts_pending(
    user_a: User, user_b: User, user_c: User, db: AsyncSession
):
    """With GROUP_CONV_REQUIRE_ACCEPT=True, non-creator members start is_accepted=False."""
    from app.core.config import settings
    from app.services.chat import create_group_conversation

    # Ensure flag is True (it's the default)
    original = settings.group_conv_require_accept
    settings.group_conv_require_accept = True

    try:
        conv = await create_group_conversation(
            db=db,
            creator_id=user_a.id,
            member_ids=[user_b.id, user_c.id],
            title="Test Group",
        )
        await db.flush()

        creator_member = next(m for m in conv.members if m.user_id == user_a.id)
        invitee_member = next(m for m in conv.members if m.user_id == user_b.id)

        assert creator_member.is_accepted is True, "Creator must be auto-accepted"
        assert invitee_member.is_accepted is False, "Non-creator must start pending when flag=True"
    finally:
        settings.group_conv_require_accept = original


@pytest.mark.asyncio
async def test_group_conv_require_accept_false_all_accepted(
    user_a: User, user_b: User, db: AsyncSession
):
    """With GROUP_CONV_REQUIRE_ACCEPT=False, all members start is_accepted=True (legacy)."""
    from app.core.config import settings
    from app.services.chat import create_group_conversation

    original = settings.group_conv_require_accept
    settings.group_conv_require_accept = False

    try:
        conv = await create_group_conversation(
            db=db,
            creator_id=user_a.id,
            member_ids=[user_b.id],
            title="Legacy Group",
        )
        await db.flush()

        for m in conv.members:
            assert m.is_accepted is True, f"member {m.user_id} should be auto-accepted when flag=False"
    finally:
        settings.group_conv_require_accept = original

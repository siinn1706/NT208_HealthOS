"""Cross-user IDOR tests — WebSocket events.

Asserts that a non-member user_b cannot perform chat actions on user_a's conversations.
Uses Starlette's built-in TestClient.websocket_connect (no extra deps).

NOTE: WS tests cannot use the SAVEPOINT-isolated `db` fixture because the WS
handler opens its own AsyncSessionLocal() connection, which would not see data
written in an uncommitted SAVEPOINT. Instead, these tests use a fully-committed
session (`ws_db`) with manual cleanup.
"""
from __future__ import annotations

import asyncio
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
        for model_cls in (Message, ConversationMember, Conversation, User):
            for cleanup_model, row_id in cleanup_ids:
                if cleanup_model is not model_cls:
                    continue
                obj = await session.get(model_cls, row_id)
                if obj is not None:
                    await session.delete(obj)
        await session.commit()

    await engine.dispose()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_user(label: str) -> User:
    suffix = uuid.uuid4().hex[:12]
    return User(
        email=f"{label}-{suffix}@example.test",
        username=f"{label}_{suffix}",
        display_name=f"{label} User",
        hashed_password="x",
        has_password=True,
    )


async def _create_users(
    session: AsyncSession,
    cleanup_ids: list[tuple[type, uuid.UUID]],
    *labels: str,
) -> tuple[User, ...]:
    users = tuple(_make_user(label) for label in labels)
    session.add_all(users)
    await session.flush()
    cleanup_ids.extend((User, user.id) for user in users)
    return users


async def _setup_ws_scenario(ws_db) -> tuple[User, User, Conversation, Message]:
    """Create two users, a conversation owned by user_a, and a message. Returns committed data."""
    session, cleanup_ids = ws_db

    ua = _make_user("ws_a")
    ub = _make_user("ws_b")
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


WsAction = tuple[str, dict] | str


def _run_ws_script(token: str, actions: list[WsAction]) -> list[dict]:
    responses: list[dict] = []
    with TestClient(app).websocket_connect(f"/ws?token={token}") as ws_client:
        for action in actions:
            if isinstance(action, str):
                ws_client.send_text(action)
            else:
                event, payload = action
                ws_client.send_text(json.dumps({"event": event, "payload": payload}))
            responses.append(json.loads(ws_client.receive_text()))
    return responses


async def _ws_script(token: str, actions: list[WsAction]) -> list[dict]:
    return await asyncio.to_thread(_run_ws_script, token, actions)


async def _ws_exchange(token: str, event: str, payload: dict) -> dict:
    return (await _ws_script(token, [(event, payload)]))[0]


def _assert_chat_forbidden(response: dict, event: str) -> None:
    assert response.get("event") in ("chat.error", "error"), (
        f"{event}: expected error frame, got {response.get('event')!r}"
    )
    code = response.get("payload", {}).get("code", "")
    assert "FORBIDDEN" in code or "INVALID" in code or "NOT_MEMBER" in code, (
        f"{event}: expected FORBIDDEN-family code, got {code!r}"
    )


# ── WS protocol robustness tests ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ws_rejects_non_object_frame_without_closing_socket(ws_db):
    user_a, _, _, _ = await _setup_ws_scenario(ws_db)
    ticket_a = create_ws_ticket(user_a.id)

    resp, hello = await _ws_script(ticket_a, ["[]", ("client:hello", {})])

    assert resp.get("event") == "error"
    assert resp.get("payload", {}).get("code") == "INVALID_FRAME"
    assert hello.get("event") == "server:hello"


@pytest.mark.asyncio
async def test_ws_invalid_reply_to_id_returns_error_without_closing_socket(ws_db):
    user_a, _, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_a = create_ws_ticket(user_a.id)

    resp, hello = await _ws_script(
        ticket_a,
        [
            ("msg:send", {
                "conversation_id": str(conv.id),
                "content": "hello with bad reply id",
                "reply_to_id": "not-a-uuid",
            }),
            ("client:hello", {}),
        ],
    )

    assert resp.get("event") == "error"
    assert resp.get("payload", {}).get("code") == "INVALID_PAYLOAD"
    assert hello.get("event") == "server:hello"


# ── WS room eviction regression tests ─────────────────────────────────────────

def test_connection_manager_leave_user_room_removes_all_user_sockets():
    from app.ws.handlers import ConnectionManager

    manager = ConnectionManager()
    room = "conv:abc"
    user_id = "user-1"
    other_id = "user-2"
    ws_a = object()
    ws_b = object()
    ws_other = object()

    manager.user_connections[user_id] = {ws_a, ws_b}
    manager.user_connections[other_id] = {ws_other}
    manager.ws_to_user.update({ws_a: user_id, ws_b: user_id, ws_other: other_id})
    manager.ws_to_rooms.update({
        ws_a: {room, f"user:{user_id}"},
        ws_b: {room},
        ws_other: {room},
    })
    manager.room_connections[room] = {ws_a, ws_b, ws_other}

    removed = manager.leave_user_room(user_id, room)

    assert removed == 2
    assert manager.room_connections[room] == {ws_other}
    assert room not in manager.ws_to_rooms[ws_a]
    assert room not in manager.ws_to_rooms[ws_b]
    assert room in manager.ws_to_rooms[ws_other]


# ── WS non-member denial tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ws_msg_send_non_member_forbidden(ws_db):
    _, user_b, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:send", {
        "conversation_id": str(conv.id),
        "content": "intruder message",
        "content_type": "text",
    })
    _assert_chat_forbidden(resp, "msg:send")


@pytest.mark.asyncio
async def test_ws_msg_edit_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:edit", {
        "conversation_id": str(conv.id),
        "message_id": str(msg.id),
        "new_content": "hacked",
    })
    _assert_chat_forbidden(resp, "msg:edit")


@pytest.mark.asyncio
async def test_ws_msg_delete_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:delete", {
        "conversation_id": str(conv.id),
        "message_id": str(msg.id),
    })
    _assert_chat_forbidden(resp, "msg:delete")


@pytest.mark.asyncio
async def test_ws_msg_read_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:read", {
        "conversation_id": str(conv.id),
        "last_message_id": str(msg.id),
    })
    _assert_chat_forbidden(resp, "msg:read")


@pytest.mark.asyncio
async def test_ws_typing_non_member_forbidden(ws_db):
    _, user_b, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "typing", {
        "conversation_id": str(conv.id),
        "is_typing": True,
    })
    _assert_chat_forbidden(resp, "typing")


@pytest.mark.asyncio
async def test_ws_msg_react_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:react", {
        "conversation_id": str(conv.id),
        "message_id": str(msg.id),
        "emoji": "👍",
    })
    _assert_chat_forbidden(resp, "msg:react")


@pytest.mark.asyncio
async def test_ws_msg_pin_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:pin", {
        "conversation_id": str(conv.id),
        "message_id": str(msg.id),
    })
    _assert_chat_forbidden(resp, "msg:pin")


@pytest.mark.asyncio
async def test_ws_msg_unpin_non_member_forbidden(ws_db):
    _, user_b, conv, msg = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "msg:unpin", {
        "conversation_id": str(conv.id),
        "message_id": str(msg.id),
    })
    _assert_chat_forbidden(resp, "msg:unpin")


@pytest.mark.asyncio
async def test_ws_conv_sync_non_member_forbidden(ws_db):
    _, user_b, conv, _ = await _setup_ws_scenario(ws_db)
    ticket_b = create_ws_ticket(user_b.id)
    resp = await _ws_exchange(ticket_b, "conv:sync", {
        "conversation_id": str(conv.id),
        "before_message_id": None,
        "limit": 20,
    })
    _assert_chat_forbidden(resp, "conv:sync")


# ── Group conv auto-accept regression tests (Phase 3 finding) ────────────────

@pytest.mark.asyncio
async def test_group_conv_require_accept_non_creator_starts_pending(ws_db):
    """With GROUP_CONV_REQUIRE_ACCEPT=True, non-creator members start is_accepted=False."""
    from app.core.config import settings
    from app.services.chat import create_group_conversation

    session, cleanup_ids = ws_db
    user_a, user_b, user_c = await _create_users(
        session,
        cleanup_ids,
        "group_a",
        "group_b",
        "group_c",
    )

    # Ensure flag is True (it's the default)
    original = settings.group_conv_require_accept
    settings.group_conv_require_accept = True

    try:
        conv = await create_group_conversation(
            db=session,
            creator_id=user_a.id,
            title="Test Group",
            member_ids=[user_b.id, user_c.id],
        )
        await session.flush()
        cleanup_ids.extend((ConversationMember, member.id) for member in conv.members)
        cleanup_ids.append((Conversation, conv.id))

        creator_member = next(m for m in conv.members if m.user_id == user_a.id)
        invitee_member = next(m for m in conv.members if m.user_id == user_b.id)

        assert creator_member.is_accepted is True, "Creator must be auto-accepted"
        assert invitee_member.is_accepted is False, "Non-creator must start pending when flag=True"
    finally:
        settings.group_conv_require_accept = original


@pytest.mark.asyncio
async def test_group_conv_require_accept_false_all_accepted(ws_db):
    """With GROUP_CONV_REQUIRE_ACCEPT=False, all members start is_accepted=True (legacy)."""
    from app.core.config import settings
    from app.services.chat import create_group_conversation

    session, cleanup_ids = ws_db
    user_a, user_b = await _create_users(session, cleanup_ids, "legacy_a", "legacy_b")

    original = settings.group_conv_require_accept
    settings.group_conv_require_accept = False

    try:
        conv = await create_group_conversation(
            db=session,
            creator_id=user_a.id,
            title="Legacy Group",
            member_ids=[user_b.id],
        )
        await session.flush()
        cleanup_ids.extend((ConversationMember, member.id) for member in conv.members)
        cleanup_ids.append((Conversation, conv.id))

        for m in conv.members:
            assert m.is_accepted is True, f"member {m.user_id} should be auto-accepted when flag=False"
    finally:
        settings.group_conv_require_accept = original

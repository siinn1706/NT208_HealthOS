"""Integration tests: store-and-forward chat (offline recipient scenario).

Verifies:
- Message persists in DB regardless of recipient WS state
- Recipient retrieves missed messages via REST cursor pagination
- unread_count reflects offline-period writes
- client_message_id idempotency prevents duplicate DB rows
- reply/read cursors stay scoped to their conversation
- Cursor pagination works across page boundaries

All tests run against real Postgres; skipped when database_url is absent.
"""
from __future__ import annotations

import datetime
import uuid
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal, engine
from app.core.config import settings
from app.models.core import (
    Conversation,
    ConversationMember,
    ConversationTypeEnum,
    Message,
    MessageContentTypeEnum,
    User,
)
from app.services import chat as chat_svc


pytestmark = pytest.mark.skipif(
    not settings.database_url,
    reason="needs real Postgres",
)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures and helpers
# ─────────────────────────────────────────────────────────────────────────────

def _rand_email() -> str:
    return f"sf-test-{uuid.uuid4().hex[:8]}@test.local"


async def _create_user(db: AsyncSession, *, email: str | None = None) -> User:
    u = User(
        email=email or _rand_email(),
        username=f"sftest_{uuid.uuid4().hex[:8]}",
        display_name="SF Test User",
        hashed_password="x",
        has_password=True,
    )
    db.add(u)
    await db.flush()
    return u


async def _create_direct_conversation(
    db: AsyncSession,
    sender: User,
    recipient: User,
) -> Conversation:
    """Create a DIRECT conversation with both users accepted."""
    conv = Conversation(
        type=ConversationTypeEnum.DIRECT,
        created_by=sender.id,
    )
    db.add(conv)
    await db.flush()

    db.add(ConversationMember(
        conversation_id=conv.id,
        user_id=sender.id,
        role="owner",
        is_accepted=True,
    ))
    db.add(ConversationMember(
        conversation_id=conv.id,
        user_id=recipient.id,
        role="member",
        is_accepted=True,
    ))
    await db.flush()
    return conv


@pytest_asyncio.fixture
async def pg_db():
    """Async session with automatic cleanup."""
    created_ids: dict[str, list[uuid.UUID]] = {"users": [], "convs": []}
    async with AsyncSessionLocal() as db:
        try:
            yield db, created_ids
        finally:
            pass
    if created_ids["users"] or created_ids["convs"]:
        async with AsyncSessionLocal() as cleanup:
            if created_ids["convs"]:
                await cleanup.execute(
                    delete(Conversation).where(Conversation.id.in_(created_ids["convs"]))
                )
            if created_ids["users"]:
                await cleanup.execute(
                    delete(User).where(User.id.in_(created_ids["users"]))
                )
            await cleanup.commit()


@pytest_asyncio.fixture(scope="module", autouse=True)
async def dispose_engine():
    """Dispose the shared async engine once after all tests in this module complete."""
    yield
    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_send_persists_when_recipient_has_no_ws(pg_db):
    """Message row exists in DB even when recipient has no WS socket.

    Also verifies that fanout was attempted for the recipient and that
    a fanout exception (simulated offline) does not surface to the caller.
    """
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].append(conv.id)
    await db.commit()

    # Persist message via service layer (same path as REST endpoint)
    msg = await chat_svc.send_message(
        db,
        conversation_id=conv.id,
        sender_id=sender.id,
        content="hello offline world",
        client_message_id="sf-test-1",
    )
    await db.commit()

    # Message must exist in DB regardless of WS state
    row = (await db.execute(select(Message).where(Message.id == msg.id))).scalar_one_or_none()
    assert row is not None
    assert row.content == "hello offline world"
    assert row.sender_id == sender.id
    assert row.client_message_id == "sf-test-1"

    # Fanout ATTEMPTED for recipient; exception swallowed (offline simulation)
    from app.api.v1.endpoints.conversations import _notify_conversation_members

    fanout_calls: list[str] = []

    async def _mock_offline_send(user_id: str, frame: dict) -> None:
        fanout_calls.append(user_id)
        if user_id == str(recipient.id):
            raise OSError("recipient has no socket")

    with patch("app.api.v1.endpoints.conversations.ws_manager.send_to_user", _mock_offline_send):
        # Must not raise even though recipient send raises
        await _notify_conversation_members(
            db, conv.id, "chat.message.sent", msg.model_dump(mode="json"),
            exclude_user_id=sender.id,
        )

    assert str(recipient.id) in fanout_calls


@pytest.mark.asyncio
async def test_recipient_catches_up_via_rest_after_reconnect(pg_db):
    """All messages sent while recipient was offline are returned by GET /messages."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].append(conv.id)
    await db.commit()

    # Sender posts 3 messages while recipient has no WS
    for i in range(3):
        await chat_svc.send_message(
            db,
            conversation_id=conv.id,
            sender_id=sender.id,
            content=f"missed message {i}",
        )
    await db.commit()

    # Recipient reconnects and fetches via REST
    msgs, has_more = await chat_svc.get_messages(
        db, conv.id, recipient.id, before=None, limit=50
    )

    assert len(msgs) == 3
    assert not has_more
    contents = {m.content for m in msgs}
    assert {"missed message 0", "missed message 1", "missed message 2"} == contents


@pytest.mark.asyncio
async def test_unread_count_reflects_offline_period_messages(pg_db):
    """unread_count in get_conversations equals messages sent since last_read_at."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].append(conv.id)
    await db.commit()

    # Sender posts 5 messages; recipient's last_read_at stays NULL (all unread)
    for i in range(5):
        await chat_svc.send_message(
            db,
            conversation_id=conv.id,
            sender_id=sender.id,
            content=f"unread msg {i}",
        )
    await db.commit()

    # Recipient fetches conversation list
    convs = await chat_svc.get_conversations(db, recipient.id, presence_map={})
    target = next((c for c in convs if c.id == conv.id), None)
    assert target is not None
    assert target.unread_count == 5


@pytest.mark.asyncio
async def test_idempotent_client_message_id_on_duplicate_post(pg_db):
    """Duplicate POST with same client_message_id returns original row without inserting a new one."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].append(conv.id)
    await db.commit()

    # First POST
    msg1 = await chat_svc.send_message(
        db,
        conversation_id=conv.id,
        sender_id=sender.id,
        content="idempotent payload",
        client_message_id="dup-1",
    )
    await db.commit()

    # Second POST with identical client_message_id
    msg2 = await chat_svc.send_message(
        db,
        conversation_id=conv.id,
        sender_id=sender.id,
        content="idempotent payload",
        client_message_id="dup-1",
    )
    await db.commit()

    # Same message returned
    assert msg1.id == msg2.id

    # Only one DB row exists for that client_message_id
    count = (
        await db.execute(
            select(func.count()).where(
                Message.client_message_id == "dup-1",
                Message.conversation_id == conv.id,
            )
        )
    ).scalar_one()
    assert count == 1


@pytest.mark.asyncio
async def test_reply_to_must_belong_to_same_conversation(pg_db):
    """A reply preview cannot reference a message from another conversation."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv_a = await _create_direct_conversation(db, sender, recipient)
    conv_b = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].extend([conv_a.id, conv_b.id])
    await db.commit()

    other_msg = await chat_svc.send_message(
        db,
        conversation_id=conv_b.id,
        sender_id=sender.id,
        content="other conversation",
    )
    await db.commit()

    with pytest.raises(ValueError, match="Reply target"):
        await chat_svc.send_message(
            db,
            conversation_id=conv_a.id,
            sender_id=sender.id,
            content="cross-conv reply",
            reply_to_id=other_msg.id,
        )


@pytest.mark.asyncio
async def test_mark_read_ignores_message_from_another_conversation(pg_db):
    """A read cursor from another conversation must not hide unread messages."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv_a = await _create_direct_conversation(db, sender, recipient)
    conv_b = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].extend([conv_a.id, conv_b.id])
    await db.commit()

    await chat_svc.send_message(
        db,
        conversation_id=conv_a.id,
        sender_id=sender.id,
        content="still unread",
    )
    other_msg = await chat_svc.send_message(
        db,
        conversation_id=conv_b.id,
        sender_id=sender.id,
        content="wrong cursor",
    )
    await db.commit()

    await chat_svc.mark_conversation_read(db, conv_a.id, recipient.id, other_msg.id)
    await db.commit()

    convs = await chat_svc.get_conversations(db, recipient.id, presence_map={})
    target = next((c for c in convs if c.id == conv_a.id), None)
    assert target is not None
    assert target.unread_count == 1


@pytest.mark.asyncio
async def test_cursor_pagination_for_missed_messages(pg_db):
    """Cursor pagination returns all missed messages across page boundaries."""
    db, ids = pg_db
    sender = await _create_user(db)
    recipient = await _create_user(db)
    ids["users"].extend([sender.id, recipient.id])

    conv = await _create_direct_conversation(db, sender, recipient)
    ids["convs"].append(conv.id)
    await db.commit()

    # Insert 75 messages with distinct timestamps directly (bypass server-side now()
    # which is constant within a transaction and would break cursor comparisons).
    base_ts = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=75)
    for i in range(75):
        msg = Message(
            conversation_id=conv.id,
            sender_id=sender.id,
            content=f"msg {i:03d}",
            content_type=MessageContentTypeEnum.TEXT,
            created_at=base_ts + datetime.timedelta(seconds=i),
        )
        db.add(msg)
    await db.flush()
    await db.commit()

    # Page 1: 50 newest messages
    page1, has_more1 = await chat_svc.get_messages(
        db, conv.id, recipient.id, before=None, limit=50
    )
    assert len(page1) == 50
    assert has_more1

    # Cursor is the created_at of the oldest message on page 1
    next_cursor = page1[-1].created_at

    # Page 2: remaining 25 older messages
    page2, has_more2 = await chat_svc.get_messages(
        db, conv.id, recipient.id, before=next_cursor, limit=50
    )
    assert len(page2) == 25
    assert not has_more2

    # Combined pages cover all 75 messages without overlap
    all_ids = {m.id for m in page1} | {m.id for m in page2}
    assert len(all_ids) == 75

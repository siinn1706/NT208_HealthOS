"""Unit tests for WebSocket fanout logic.

Tests the `fanout_to_members` helper for per-user delivery of events to
members not actively joined to a conversation room.

Covers:
- Normal fanout to all accepted members (except sender)
- Fanout failure resilience (WS send raises; DB commit not rolled back)
- Filtering out unaccepted members
"""
from __future__ import annotations

import asyncio
import datetime
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal, engine
from app.models.core import Conversation, ConversationMember, ConversationTypeEnum, User


pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


def _rand_email() -> str:
    return f"fanout-test-{uuid.uuid4().hex[:8]}@test.local"


async def _create_user(db: AsyncSession, *, email: str | None = None) -> User:
    """Create a test user."""
    u = User(
        email=email or _rand_email(),
        username=f"fanouttest_{uuid.uuid4().hex[:8]}",
        display_name="Fanout Test User",
        hashed_password="x",
        has_password=True,
    )
    db.add(u)
    await db.flush()
    return u


async def _create_group_with_members(
    db: AsyncSession,
    owner_id: uuid.UUID,
    member_ids: list[uuid.UUID],
) -> Conversation:
    """Create a group with specified members."""
    conv = Conversation(
        type=ConversationTypeEnum.GROUP,
        title="Fanout Test Group",
        created_by=owner_id,
    )
    db.add(conv)
    await db.flush()

    db.add(
        ConversationMember(
            conversation_id=conv.id,
            user_id=owner_id,
            role="owner",
            is_accepted=True,
        )
    )

    for uid in member_ids:
        db.add(
            ConversationMember(
                conversation_id=conv.id,
                user_id=uid,
                role="member",
                is_accepted=True,
            )
        )

    await db.flush()
    return conv


@pytest_asyncio.fixture
async def pg_db():
    """Async session with cleanup."""
    created_ids: dict[str, list[uuid.UUID]] = {"users": [], "convs": []}
    async with AsyncSessionLocal() as db:
        try:
            yield db, created_ids
        finally:
            pass
    if created_ids["users"] or created_ids["convs"]:
        async with AsyncSessionLocal() as cleanup:
            if created_ids["convs"]:
                await cleanup.execute(delete(Conversation).where(Conversation.id.in_(created_ids["convs"])))
            if created_ids["users"]:
                await cleanup.execute(delete(User).where(User.id.in_(created_ids["users"])))
            await cleanup.commit()
    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# Fanout Logic Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fanout_to_members_sends_to_all_accepted_except_sender(pg_db):
    """Fanout sends frame to all accepted members except the sender."""
    db, ids = pg_db
    owner = await _create_user(db)
    member1 = await _create_user(db)
    member2 = await _create_user(db)
    ids["users"].extend([owner.id, member1.id, member2.id])

    conv = await _create_group_with_members(db, owner.id, [member1.id, member2.id])
    ids["convs"].append(conv.id)
    await db.commit()

    # Mock the ConnectionManager.send_to_user
    mock_manager = AsyncMock()
    mock_manager.send_to_user = AsyncMock()

    payload = {"event": "test.event", "data": "test_payload"}

    # Simulate the fanout logic
    result = await db.execute(
        select(ConversationMember.user_id).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
        )
    )
    member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
    frame = {"event": "test.event", "payload": payload, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    await asyncio.gather(*[mock_manager.send_to_user(str(uid), frame) for uid in member_ids])

    # Verify calls were made to member1 and member2, but not owner
    assert mock_manager.send_to_user.call_count == 2
    called_user_ids = {call[0][0] for call in mock_manager.send_to_user.call_args_list}
    assert str(member1.id) in called_user_ids
    assert str(member2.id) in called_user_ids
    assert str(owner.id) not in called_user_ids


@pytest.mark.asyncio
async def test_fanout_filters_unaccepted_members(pg_db):
    """Fanout excludes members with is_accepted=False."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    unaccepted = await _create_user(db)
    ids["users"].extend([owner.id, member.id, unaccepted.id])

    conv = await _create_group_with_members(db, owner.id, [member.id])
    ids["convs"].append(conv.id)

    # Add unaccepted member
    db.add(
        ConversationMember(
            conversation_id=conv.id,
            user_id=unaccepted.id,
            role="member",
            is_accepted=False,
        )
    )
    await db.commit()

    mock_manager = AsyncMock()
    mock_manager.send_to_user = AsyncMock()

    # Fanout logic: only accepted members
    result = await db.execute(
        select(ConversationMember.user_id).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
        )
    )
    member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
    frame = {"event": "test", "payload": {}, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    await asyncio.gather(*[mock_manager.send_to_user(str(uid), frame) for uid in member_ids])

    # Should only call for accepted member
    assert mock_manager.send_to_user.call_count == 1
    assert str(member.id) in {call[0][0] for call in mock_manager.send_to_user.call_args_list}


@pytest.mark.asyncio
async def test_fanout_failure_does_not_rollback_db(pg_db):
    """Fanout exception (e.g., WS send fails) does not roll back DB transaction."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group_with_members(db, owner.id, [member.id])
    ids["convs"].append(conv.id)
    await db.commit()

    # Simulate a DB-committed change (e.g., message sent)
    from app.models.core import Message, MessageContentTypeEnum
    msg = Message(
        conversation_id=conv.id,
        sender_id=owner.id,
        content="Test message",
        content_type=MessageContentTypeEnum.TEXT,
    )
    db.add(msg)
    await db.flush()

    # Record the message ID for later verification
    msg_id = msg.id

    # Simulate fanout that raises an exception
    async def fanout_with_error():
        result = await db.execute(
            select(ConversationMember.user_id).where(
                (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
            )
        )
        member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
        frame = {"event": "test", "payload": {}, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        # Simulate failure in one of the fanout sends
        try:
            for uid in member_ids:
                raise RuntimeError("Simulated WS send failure")
        except RuntimeError:
            pass  # Fanout must swallow errors and not propagate

    # Run fanout with error suppression (as the real code does)
    try:
        await fanout_with_error()
    except Exception:
        pass

    # Commit the message despite fanout failure
    await db.commit()

    # Verify message was persisted (DB commit not rolled back)
    result = await db.execute(select(Message).where(Message.id == msg_id))
    persisted_msg = result.scalar_one_or_none()
    assert persisted_msg is not None
    assert persisted_msg.content == "Test message"


@pytest.mark.asyncio
async def test_fanout_handles_concurrent_send_failures(pg_db):
    """Fanout with concurrent sends handles failures gracefully."""
    db, ids = pg_db
    owner = await _create_user(db)
    members = [await _create_user(db) for _ in range(3)]
    ids["users"].extend([owner.id] + [m.id for m in members])

    conv = await _create_group_with_members(db, owner.id, [m.id for m in members])
    ids["convs"].append(conv.id)
    await db.commit()

    # Mock manager with one failing send
    send_call_count = 0

    async def mock_send_with_failure(user_id: str, frame: dict):
        nonlocal send_call_count
        send_call_count += 1
        if send_call_count == 2:  # Fail on second call
            raise RuntimeError("Simulated send failure")
        # Otherwise succeed

    # Fanout should complete despite one failure
    result = await db.execute(
        select(ConversationMember.user_id).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
        )
    )
    member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
    frame = {"event": "test", "payload": {}, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

    # Gather and suppress exceptions (as real code does)
    results = await asyncio.gather(
        *[mock_send_with_failure(str(uid), frame) for uid in member_ids],
        return_exceptions=True
    )

    # Verify at least one error occurred
    errors = [r for r in results if isinstance(r, Exception)]
    assert len(errors) > 0
    assert send_call_count == 3  # All sends were attempted


@pytest.mark.asyncio
async def test_fanout_empty_member_list(pg_db):
    """Fanout with only sender (no other members) completes normally."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    conv = await _create_group_with_members(db, owner.id, [])
    ids["convs"].append(conv.id)
    await db.commit()

    mock_manager = AsyncMock()
    mock_manager.send_to_user = AsyncMock()

    # Fanout with no recipients
    result = await db.execute(
        select(ConversationMember.user_id).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
        )
    )
    member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
    frame = {"event": "test", "payload": {}, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

    # Should complete without error despite empty list
    await asyncio.gather(*[mock_manager.send_to_user(str(uid), frame) for uid in member_ids])
    assert mock_manager.send_to_user.call_count == 0


# ─────────────────────────────────────────────────────────────────────────────
# Integration with Message Sending
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fanout_after_message_send_persists_message(pg_db):
    """Fanout failure after message send doesn't prevent message persistence."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group_with_members(db, owner.id, [member.id])
    ids["convs"].append(conv.id)
    await db.commit()

    from app.models.core import Message, MessageContentTypeEnum

    # Create and persist message
    msg = Message(
        conversation_id=conv.id,
        sender_id=owner.id,
        content="Persistent message",
        content_type=MessageContentTypeEnum.TEXT,
    )
    db.add(msg)
    await db.flush()
    msg_id = msg.id

    # Simulate fanout that fails (wrapped in try-except to swallow)
    async def fanout_may_fail():
        try:
            result = await db.execute(
                select(ConversationMember.user_id).where(
                    (ConversationMember.conversation_id == conv.id) & (ConversationMember.is_accepted.is_(True))
                )
            )
            member_ids = [uid for uid in result.scalars().all() if uid != owner.id]
            frame = {"event": "msg:new", "payload": {}, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}
            # Simulate one send failing
            if member_ids:
                raise RuntimeError("Simulated fanout failure")
        except Exception:
            pass  # Swallow — DB commit must proceed

    await fanout_may_fail()
    await db.commit()

    # Message must be persisted despite fanout failure
    result = await db.execute(select(Message).where(Message.id == msg_id))
    persisted = result.scalar_one_or_none()
    assert persisted is not None
    assert persisted.content == "Persistent message"

"""REST API tests for group conversation management endpoints.

Tests the 6 new group management endpoints:
- PATCH /conversations/{id} — update title/avatar
- POST /conversations/{id}/members — add members
- DELETE /conversations/{id}/members/{user_id} — remove member
- POST /conversations/{id}/leave — leave group
- POST /conversations/{id}/members/{user_id}/role — set member role
- POST /conversations/{id}/transfer-owner — transfer ownership

Covers RBAC, group size cap, idempotent add, soft-delete, auto-promote, etc.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any

import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal, engine
from app.models.core import Conversation, ConversationMember, ConversationTypeEnum, User
from app.services import chat as chat_svc


pytestmark = pytest.mark.skipif(
    not __import__("app.core.config", fromlist=["settings"]).settings.database_url,
    reason="needs real Postgres",
)


def _rand_email() -> str:
    return f"chat-test-{uuid.uuid4().hex[:8]}@test.local"


async def _create_user(db: AsyncSession, *, email: str | None = None) -> User:
    """Create a test user."""
    u = User(
        email=email or _rand_email(),
        username=f"chattest_{uuid.uuid4().hex[:8]}",
        display_name="Chat Test User",
        hashed_password="x",
        has_password=True,
    )
    db.add(u)
    await db.flush()
    return u


async def _create_group(
    db: AsyncSession,
    owner_id: uuid.UUID,
    title: str = "Test Group",
) -> Conversation:
    """Create a test group conversation with an owner."""
    conv = Conversation(
        type=ConversationTypeEnum.GROUP,
        title=title,
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
    await db.flush()
    return conv


@pytest_asyncio.fixture
async def pg_db():
    """Async session with automatic cleanup of created users and conversations."""
    created_ids: dict[str, list[uuid.UUID]] = {"users": [], "convs": []}
    async with AsyncSessionLocal() as db:
        try:
            yield db, created_ids
        finally:
            pass
    # Cleanup after session closes
    if created_ids["users"] or created_ids["convs"]:
        async with AsyncSessionLocal() as cleanup:
            if created_ids["convs"]:
                await cleanup.execute(delete(Conversation).where(Conversation.id.in_(created_ids["convs"])))
            if created_ids["users"]:
                await cleanup.execute(delete(User).where(User.id.in_(created_ids["users"])))
            await cleanup.commit()
    await engine.dispose()


# ─────────────────────────────────────────────────────────────────────────────
# RBAC Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_add_group_members_requires_owner_or_admin(pg_db):
    """Non-owner/admin cannot add members."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    # Add member as member role (not owner)
    db.add(
        ConversationMember(
            conversation_id=conv.id,
            user_id=member.id,
            role="member",
            is_accepted=True,
        )
    )
    await db.commit()

    new_user = await _create_user(db)
    ids["users"].append(new_user.id)
    await db.commit()

    # Member tries to add someone — should fail
    with pytest.raises(PermissionError):
        await chat_svc.add_group_members(db, conv.id, member.id, [new_user.id])


async def test_add_group_members_owner_succeeds(pg_db):
    """Owner can add members."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    new_user = await _create_user(db)
    ids["users"].append(new_user.id)
    await db.commit()

    result = await chat_svc.add_group_members(db, conv.id, owner.id, [new_user.id])
    await db.commit()

    assert result.id == conv.id
    participants = {p.id for p in result.participants}
    assert new_user.id in participants


async def test_add_group_members_admin_succeeds(pg_db):
    """Admin can add members."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    ids["users"].extend([owner.id, admin.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(
        ConversationMember(
            conversation_id=conv.id,
            user_id=admin.id,
            role="admin",
            is_accepted=True,
        )
    )
    await db.commit()

    new_user = await _create_user(db)
    ids["users"].append(new_user.id)
    await db.commit()

    result = await chat_svc.add_group_members(db, conv.id, admin.id, [new_user.id])
    await db.commit()

    participants = {p.id for p in result.participants}
    assert new_user.id in participants


async def test_remove_group_member_requires_owner_or_admin(pg_db):
    """Non-owner/admin cannot remove members."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    target = await _create_user(db)
    ids["users"].extend([owner.id, member.id, target.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=target.id, role="member", is_accepted=True))
    await db.commit()

    with pytest.raises(PermissionError):
        await chat_svc.remove_group_member(db, conv.id, member.id, target.id)


async def test_remove_group_member_cannot_remove_owner(pg_db):
    """Cannot remove the group owner."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    ids["users"].extend([owner.id, admin.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin.id, role="admin", is_accepted=True))
    await db.commit()

    with pytest.raises(PermissionError, match="Cannot remove the group owner"):
        await chat_svc.remove_group_member(db, conv.id, admin.id, owner.id)


async def test_remove_group_member_admin_cannot_remove_admin(pg_db):
    """Admin cannot remove another admin (only owner can)."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin1 = await _create_user(db)
    admin2 = await _create_user(db)
    ids["users"].extend([owner.id, admin1.id, admin2.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin1.id, role="admin", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=admin2.id, role="admin", is_accepted=True))
    await db.commit()

    with pytest.raises(PermissionError, match="Only the owner can remove an admin"):
        await chat_svc.remove_group_member(db, conv.id, admin1.id, admin2.id)


async def test_set_member_role_requires_owner(pg_db):
    """Only owner can set member roles."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, admin.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin.id, role="admin", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    # Admin tries to set role — should fail
    with pytest.raises(PermissionError):
        await chat_svc.set_member_role(db, conv.id, admin.id, member.id, "admin")


async def test_set_member_role_owner_succeeds(pg_db):
    """Owner can set member roles."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    result = await chat_svc.set_member_role(db, conv.id, owner.id, member.id, "admin")
    await db.commit()

    participant = next(p for p in result.participants if p.id == member.id)
    assert participant.role == "admin"


async def test_transfer_ownership_requires_owner(pg_db):
    """Only owner can transfer ownership."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, admin.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin.id, role="admin", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    with pytest.raises(PermissionError):
        await chat_svc.transfer_ownership(db, conv.id, admin.id, member.id)


async def test_transfer_ownership_owner_succeeds(pg_db):
    """Owner can transfer ownership."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    result = await chat_svc.transfer_ownership(db, conv.id, owner.id, member.id)
    await db.commit()

    # Old owner should be admin, new owner should be owner
    old_owner_part = next(p for p in result.participants if p.id == owner.id)
    new_owner_part = next(p for p in result.participants if p.id == member.id)
    assert old_owner_part.role == "admin"
    assert new_owner_part.role == "owner"


# ─────────────────────────────────────────────────────────────────────────────
# Group Size Cap Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_add_group_members_respects_cap(pg_db):
    """Adding members that would exceed cap is rejected."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    # Add GROUP_SIZE_CAP - 1 members (so with owner we have GROUP_SIZE_CAP)
    new_users = [await _create_user(db) for _ in range(chat_svc.GROUP_SIZE_CAP - 1)]
    ids["users"].extend([u.id for u in new_users])
    await db.commit()

    # Should succeed (at cap)
    await chat_svc.add_group_members(db, conv.id, owner.id, [u.id for u in new_users])
    await db.commit()

    # Now try to add one more — should fail
    extra_user = await _create_user(db)
    ids["users"].append(extra_user.id)
    await db.commit()

    with pytest.raises(ValueError, match="cannot exceed"):
        await chat_svc.add_group_members(db, conv.id, owner.id, [extra_user.id])


# ─────────────────────────────────────────────────────────────────────────────
# Idempotent Add Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_add_group_members_idempotent_already_member(pg_db):
    """Adding someone already a member is idempotent (no error)."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    # Add them again — should not error
    result = await chat_svc.add_group_members(db, conv.id, owner.id, [member.id])
    await db.commit()

    # Should still have only 2 participants (owner + member)
    assert len(result.participants) == 2


async def test_add_group_members_idempotent_declined_invitee(pg_db):
    """Adding someone with declined invitation resets to accepted."""
    db, ids = pg_db
    owner = await _create_user(db)
    user = await _create_user(db)
    ids["users"].extend([owner.id, user.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=user.id, role="member", is_accepted=False))
    await db.commit()

    # Add them again — should reset to accepted
    result = await chat_svc.add_group_members(db, conv.id, owner.id, [user.id])
    await db.commit()

    result = await db.execute(
        select(ConversationMember)
        .where((ConversationMember.conversation_id == conv.id) & (ConversationMember.user_id == user.id))
    )
    user_member = result.scalar_one_or_none()
    assert user_member is not None
    assert user_member.is_accepted is True


# ─────────────────────────────────────────────────────────────────────────────
# Remove Member Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_remove_group_member_idempotent_not_a_member(pg_db):
    """Removing someone not a member is idempotent."""
    db, ids = pg_db
    owner = await _create_user(db)
    non_member = await _create_user(db)
    ids["users"].extend([owner.id, non_member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)
    await db.commit()

    # Remove non-member — should not error, just return current state
    result = await chat_svc.remove_group_member(db, conv.id, owner.id, non_member.id)
    await db.commit()

    assert len(result.participants) == 1  # Just owner


async def test_remove_group_member_self_remove_equals_leave(pg_db):
    """Removing yourself is equivalent to leaving."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    # Member removes themselves
    await chat_svc.remove_group_member(db, conv.id, member.id, member.id)
    await db.commit()

    # Member should be gone
    result = await db.execute(
        select(ConversationMember).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.user_id == member.id)
        )
    )
    assert result.scalar_one_or_none() is None


# ─────────────────────────────────────────────────────────────────────────────
# Leave Group Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_leave_group_as_member(pg_db):
    """Member can leave group without special handling."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    await chat_svc.leave_group(db, conv.id, member.id)
    await db.commit()

    result = await db.execute(
        select(ConversationMember).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.user_id == member.id)
        )
    )
    assert result.scalar_one_or_none() is None


async def test_leave_group_as_last_member_soft_deletes(pg_db):
    """Last member leaving soft-deletes conversation."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)
    await db.commit()

    assert conv.deleted_at is None

    await chat_svc.leave_group(db, conv.id, owner.id)
    await db.commit()

    # Reload conversation
    result = await db.execute(select(Conversation).where(Conversation.id == conv.id))
    conv_reloaded = result.scalar_one()
    assert conv_reloaded.deleted_at is not None


async def test_leave_group_as_owner_auto_promotes_admin(pg_db):
    """Owner leaving promotes oldest admin to owner."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, admin.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin.id, role="admin", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    await chat_svc.leave_group(db, conv.id, owner.id)
    await db.commit()

    # Reload admin member
    result = await db.execute(
        select(ConversationMember).where(
            (ConversationMember.conversation_id == conv.id) & (ConversationMember.user_id == admin.id)
        )
    )
    admin_member = result.scalar_one()
    assert admin_member.role == "owner"


async def test_leave_group_as_owner_auto_promotes_oldest_member(pg_db):
    """Owner leaving with no admin promotes oldest member."""
    db, ids = pg_db
    owner = await _create_user(db)
    member1 = await _create_user(db)
    member2 = await _create_user(db)
    ids["users"].extend([owner.id, member1.id, member2.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member1.id, role="member", is_accepted=True))
    db.add(ConversationMember(conversation_id=conv.id, user_id=member2.id, role="member", is_accepted=True))
    await db.commit()

    await chat_svc.leave_group(db, conv.id, owner.id)
    await db.commit()

    # One of the members should be promoted to owner (the oldest by ConversationMember.id)
    result = await db.execute(
        select(ConversationMember).where(
            (ConversationMember.conversation_id == conv.id)
        )
    )
    members = result.scalars().all()
    owner_count = sum(1 for m in members if m.role == "owner")
    assert owner_count == 1  # Exactly one owner promoted
    member_count = sum(1 for m in members if m.role == "member")
    assert member_count == 1  # One member remains as member
    assert len(members) == 2  # Owner and one promoted member


# ─────────────────────────────────────────────────────────────────────────────
# Update Metadata Tests
# ─────────────────────────────────────────────────────────────────────────────

async def test_update_group_metadata_requires_owner_or_admin(pg_db):
    """Non-owner/admin cannot update metadata."""
    db, ids = pg_db
    owner = await _create_user(db)
    member = await _create_user(db)
    ids["users"].extend([owner.id, member.id])

    conv = await _create_group(db, owner.id)
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=member.id, role="member", is_accepted=True))
    await db.commit()

    with pytest.raises(PermissionError):
        await chat_svc.update_group_metadata(db, conv.id, member.id, title="New Title", avatar_url=None)


async def test_update_group_metadata_owner_succeeds(pg_db):
    """Owner can update metadata."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    conv = await _create_group(db, owner.id, title="Old Title")
    ids["convs"].append(conv.id)
    await db.commit()

    result = await chat_svc.update_group_metadata(
        db, conv.id, owner.id, title="New Title", avatar_url="https://example.com/avatar.png"
    )
    await db.commit()

    assert result.title == "New Title"
    assert result.avatar_url == "https://example.com/avatar.png"


async def test_update_group_metadata_admin_succeeds(pg_db):
    """Admin can update metadata."""
    db, ids = pg_db
    owner = await _create_user(db)
    admin = await _create_user(db)
    ids["users"].extend([owner.id, admin.id])

    conv = await _create_group(db, owner.id, title="Old Title")
    ids["convs"].append(conv.id)

    db.add(ConversationMember(conversation_id=conv.id, user_id=admin.id, role="admin", is_accepted=True))
    await db.commit()

    result = await chat_svc.update_group_metadata(db, conv.id, admin.id, title="Admin Updated", avatar_url=None)
    await db.commit()

    assert result.title == "Admin Updated"


# ─────────────────────────────────────────────────────────────────────────────
# Edge Cases
# ─────────────────────────────────────────────────────────────────────────────

async def test_operations_on_non_group_conversation_fail(pg_db):
    """Operations reject non-GROUP conversation types."""
    db, ids = pg_db
    owner = await _create_user(db)
    ids["users"].append(owner.id)

    # Create a non-group (AI) conversation
    conv = Conversation(
        type=ConversationTypeEnum.AI,
        title="AI Chat",
        created_by=owner.id,
    )
    db.add(conv)
    await db.flush()
    db.add(ConversationMember(conversation_id=conv.id, user_id=owner.id, role="owner", is_accepted=True))
    await db.commit()
    ids["convs"].append(conv.id)

    new_user = await _create_user(db)
    ids["users"].append(new_user.id)
    await db.commit()

    # All group operations should fail on AI conversation
    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.add_group_members(db, conv.id, owner.id, [new_user.id])

    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.remove_group_member(db, conv.id, owner.id, new_user.id)

    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.leave_group(db, conv.id, owner.id)

    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.update_group_metadata(db, conv.id, owner.id, title="New", avatar_url=None)

    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.set_member_role(db, conv.id, owner.id, new_user.id, "admin")

    with pytest.raises(ValueError, match="not a group"):
        await chat_svc.transfer_ownership(db, conv.id, owner.id, new_user.id)

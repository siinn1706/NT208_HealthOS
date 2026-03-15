"""Chat service — all business logic for conversations and messages.

Follows the layered architecture mandate:
  api endpoint → this service → adapters (database, redis, storage)
No direct SQLAlchemy queries in endpoints.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import (
    Conversation,
    ConversationMember,
    ConversationTypeEnum,
    Message,
    MessageContentTypeEnum,
    MessageReaction,
    MessageReceipt,
    PinnedMessage,
    User,
)
from app.schemas.chat import (
    AttachmentDTO,
    ConversationDTO,
    MessageContentType,
    MessageDTO,
    ParticipantDTO,
    ReactionDTO,
    ReplyPreviewDTO,
    UserLookupResult,
)

AI_CONVERSATION_TITLE = "HealthOS AI Assistant"


# ──────────────────────────────────────────────────────────────────────────────
# Helper: build DTOs from ORM rows
# ──────────────────────────────────────────────────────────────────────────────

def _build_reaction_dtos(reactions: list[MessageReaction]) -> list[ReactionDTO]:
    return [
        ReactionDTO(
            emoji=r.emoji,
            user_id=r.user_id,
            user_display_name=r.user.display_name if r.user else "Unknown",
        )
        for r in reactions
    ]


def _build_message_dto(
    msg: Message,
    pinned_ids: set[uuid.UUID] | None = None,
) -> MessageDTO:
    reply_preview: ReplyPreviewDTO | None = None
    if msg.reply_to:
        reply_preview = ReplyPreviewDTO(
            id=msg.reply_to.id,
            sender_display_name=(
                msg.reply_to.sender.display_name if msg.reply_to.sender else "Unknown"
            ),
            content=msg.reply_to.content,
            content_type=msg.reply_to.content_type.value,  # type: ignore[arg-type]
        )

    attachments = None
    if msg.attachments:
        attachments = [AttachmentDTO(**a) for a in msg.attachments]

    return MessageDTO(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_display_name=msg.sender.display_name if msg.sender else None,
        sender_avatar_url=(
            msg.sender.profile.avatar_url
            if msg.sender and msg.sender.profile
            else None
        ),
        client_message_id=msg.client_message_id,
        content=msg.content if not msg.is_recalled else "Tin nhắn đã bị thu hồi",
        content_type=msg.content_type.value,  # type: ignore[arg-type]
        attachments=attachments,
        reply_to_id=msg.reply_to_id,
        reply_to=reply_preview,
        is_recalled=msg.is_recalled,
        reactions=_build_reaction_dtos(msg.reactions),
        is_pinned=bool(pinned_ids and msg.id in pinned_ids),
        created_at=msg.created_at,
        edited_at=msg.edited_at,
    )


async def _get_unread_count(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    member: ConversationMember,
) -> int:
    """Count messages in conversation that the user hasn't read yet."""
    if member.last_read_at is None:
        # Count ALL messages not sent by self
        result = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                    Message.deleted_at.is_(None),
                )
            )
        )
    else:
        result = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != user_id,
                    Message.created_at > member.last_read_at,
                    Message.deleted_at.is_(None),
                )
            )
        )
    return result.scalar_one()


async def _build_conversation_dto(
    db: AsyncSession,
    conv: Conversation,
    current_user_id: uuid.UUID,
    presence_map: dict[str, bool] | None = None,
    preloaded_last_message: Message | None = None,
    preloaded_unread_count: int | None = None,
    skip_db_lookups: bool = False,
) -> ConversationDTO:
    """Enrich a Conversation ORM object into a full ConversationDTO."""
    # Participants
    participants = []
    current_member: ConversationMember | None = None
    for m in conv.members:
        if m.user_id == current_user_id:
            current_member = m
        if m.user:
            is_online = False
            if presence_map:
                is_online = presence_map.get(str(m.user_id), False)
            participants.append(
                ParticipantDTO(
                    id=m.user_id,
                    display_name=m.user.display_name,
                    avatar_url=m.user.profile.avatar_url if m.user.profile else None,
                    is_online=is_online,
                )
            )

    # Last message
    if skip_db_lookups:
        last_msg_orm = preloaded_last_message
    else:
        last_msg_result = await db.execute(
            select(Message)
            .options(
                selectinload(Message.sender).selectinload(User.profile),
                selectinload(Message.reactions).selectinload(MessageReaction.user),
            )
            .where(
                and_(
                    Message.conversation_id == conv.id,
                    Message.deleted_at.is_(None),
                )
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg_orm = last_msg_result.scalar_one_or_none()
        
    last_message = _build_message_dto(last_msg_orm) if last_msg_orm else None

    # Unread count
    if skip_db_lookups:
        unread = preloaded_unread_count or 0
    else:
        unread = 0
        if current_member:
            unread = await _get_unread_count(db, conv.id, current_user_id, current_member)

    return ConversationDTO(
        id=conv.id,
        type=conv.type.value,  # type: ignore[arg-type]
        title=conv.title,
        avatar_url=conv.avatar_url,
        participants=participants,
        last_message=last_message,
        unread_count=unread,
        is_muted=current_member.is_muted if current_member else False,
        is_pinned=current_member.is_pinned if current_member else False,
        theme_id=current_member.theme_id if current_member else None,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


async def _ensure_ai_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Conversation:
    existing_result = await db.execute(
        select(Conversation)
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Conversation.id,
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted.is_(True),
            ),
        )
        .where(Conversation.type == ConversationTypeEnum.AI)
        .options(
            selectinload(Conversation.members)
            .selectinload(ConversationMember.user)
            .selectinload(User.profile),
        )
        .limit(1)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return existing

    conv = Conversation(
        type=ConversationTypeEnum.AI,
        title=AI_CONVERSATION_TITLE,
        created_by=user_id,
    )
    db.add(conv)
    await db.flush()

    db.add(
        ConversationMember(
            conversation_id=conv.id,
            user_id=user_id,
            role="owner",
            is_accepted=True,
        )
    )
    await db.flush()

    return await _reload_conversation(db, conv.id)


# ──────────────────────────────────────────────────────────────────────────────
# Conversation operations
# ──────────────────────────────────────────────────────────────────────────────

async def _get_bulk_conversation_data(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_ids: list[uuid.UUID]
) -> tuple[dict[uuid.UUID, Message], dict[uuid.UUID, int]]:
    """Batch fetch last_messages and unread_counts for a list of conversations to prevent N+1."""
    if not conversation_ids:
        return {}, {}
    unread_query = (
        select(Message.conversation_id, func.count(Message.id))
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Message.conversation_id,
                ConversationMember.user_id == user_id,
            ),
        )
        .where(
            and_(
                Message.conversation_id.in_(conversation_ids),
                Message.sender_id != user_id,
                Message.deleted_at.is_(None),
                or_(
                    ConversationMember.last_read_at.is_(None),
                    Message.created_at > ConversationMember.last_read_at,
                ),
            )
        )
        .group_by(Message.conversation_id)
    )
    unread_result = await db.execute(unread_query)
    unread_counts = {row[0]: row[1] for row in unread_result.all()}
    subq = (
        select(
            Message.id,
            func.row_number().over(
                partition_by=Message.conversation_id,
                order_by=Message.created_at.desc()
            ).label("rn")
        )
        .where(
            and_(
                Message.conversation_id.in_(conversation_ids),
                Message.deleted_at.is_(None),
            )
        )
        .subquery()
    )

    last_msg_query = (
        select(Message)
        .options(
            selectinload(Message.sender).selectinload(User.profile),
            selectinload(Message.reactions).selectinload(MessageReaction.user),
        )
        .join(subq, and_(Message.id == subq.c.id, subq.c.rn == 1))
    )
    last_msg_result = await db.execute(last_msg_query)
    last_messages = {msg.conversation_id: msg for msg in last_msg_result.scalars().all()}

    return last_messages, unread_counts

async def get_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    presence_map: dict[str, bool] | None = None,
) -> list[ConversationDTO]:
    """Return accepted conversations for a user, sorted by latest message."""
    await _ensure_ai_conversation(db, user_id)
    result = await db.execute(
        select(Conversation)
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Conversation.id,
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted.is_(True),
            ),
        )
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user).selectinload(User.profile),
        )
        .order_by(Conversation.updated_at.desc())
    )
    convs = list(result.scalars().unique().all())
    conv_ids = [c.id for c in convs]
    last_messages, unread_counts = await _get_bulk_conversation_data(db, user_id, conv_ids)

    dtos = []
    for conv in convs:
        dtos.append(
            await _build_conversation_dto(
                db, 
                conv, 
                user_id, 
                presence_map,
                preloaded_last_message=last_messages.get(conv.id),
                preloaded_unread_count=unread_counts.get(conv.id, 0),
                skip_db_lookups=True,
            )
        )
    return dtos

async def get_pending_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[ConversationDTO]:
    """Return stranger-request conversations pending this user's acceptance."""
    result = await db.execute(
        select(Conversation)
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Conversation.id,
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted.is_(False),
            ),
        )
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user).selectinload(User.profile),
        )
        .order_by(Conversation.created_at.desc())
    )
    convs = result.scalars().unique().all()
    dtos = []
    for conv in convs:
        dtos.append(await _build_conversation_dto(db, conv, user_id))
    return dtos


async def get_pending_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[ConversationDTO]:
    """Return stranger-request conversations pending this user's acceptance."""
    result = await db.execute(
        select(Conversation)
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Conversation.id,
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted.is_(False),
            ),
        )
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user).selectinload(User.profile),
        )
        .order_by(Conversation.created_at.desc())
    )
    convs = list(result.scalars().unique().all())
    conv_ids = [c.id for c in convs]
    last_messages, unread_counts = await _get_bulk_conversation_data(db, user_id, conv_ids)

    dtos = []
    for conv in convs:
        dtos.append(
            await _build_conversation_dto(
                db, 
                conv, 
                user_id,
                preloaded_last_message=last_messages.get(conv.id),
                preloaded_unread_count=unread_counts.get(conv.id, 0),
                skip_db_lookups=True,
            )
        )
    return dtos


async def create_direct_conversation(
    db: AsyncSession,
    initiator_id: uuid.UUID,
    target_id: uuid.UUID,
) -> Conversation:
    """
    Get or create a direct conversation between two users.
    If one doesn't exist, create it with the target's membership as is_accepted=False
    (stranger-request flow). If this is the second conversation attempt (target already
    blocked the user) just raise ValueError.
    """
    # Check for existing direct conversation between the two users
    subq = (
        select(ConversationMember.conversation_id)
        .where(ConversationMember.user_id == initiator_id)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Conversation)
        .join(
            ConversationMember,
            and_(
                ConversationMember.conversation_id == Conversation.id,
                ConversationMember.user_id == target_id,
            ),
        )
        .where(
            and_(
                Conversation.type == ConversationTypeEnum.DIRECT,
                Conversation.id.in_(subq),
            )
        )
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user).selectinload(User.profile),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Create new
    conv = Conversation(
        type=ConversationTypeEnum.DIRECT,
        created_by=initiator_id,
    )
    db.add(conv)
    await db.flush()  # get conv.id

    initiator_member = ConversationMember(
        conversation_id=conv.id,
        user_id=initiator_id,
        role="member",
        is_accepted=True,
    )
    target_member = ConversationMember(
        conversation_id=conv.id,
        user_id=target_id,
        role="member",
        is_accepted=False,  # stranger request — target must accept
    )
    db.add_all([initiator_member, target_member])
    await db.flush()

    # Reload with relationships
    return await _reload_conversation(db, conv.id)


async def create_group_conversation(
    db: AsyncSession,
    creator_id: uuid.UUID,
    title: str,
    member_ids: list[uuid.UUID],
    avatar_url: str | None = None,
) -> Conversation:
    conv = Conversation(
        type=ConversationTypeEnum.GROUP,
        title=title,
        avatar_url=avatar_url,
        created_by=creator_id,
    )
    db.add(conv)
    await db.flush()

    members = [
        ConversationMember(
            conversation_id=conv.id,
            user_id=uid,
            role="owner" if uid == creator_id else "member",
            is_accepted=True,
        )
        for uid in {creator_id, *member_ids}
    ]
    db.add_all(members)
    await db.flush()
    return await _reload_conversation(db, conv.id)


async def accept_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("Conversation membership not found.")
    member.is_accepted = True
    await db.flush()


async def reject_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    delete_history: bool = True,
) -> None:
    """Reject a stranger request; optionally delete all messages."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("Conversation membership not found.")
    if delete_history:
        await db.execute(
            delete(Message).where(Message.conversation_id == conversation_id)
        )

    member_count_result = await db.execute(
        select(func.count(ConversationMember.user_id)).where(
            ConversationMember.conversation_id == conversation_id
        )
    )
    member_count = member_count_result.scalar_one()

    if member_count <= 2:
        await db.execute(
            delete(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id
            )
        )
        await db.execute(
            delete(Conversation).where(Conversation.id == conversation_id)
        )
    else:
        await db.delete(member)

    await db.flush()


async def update_conversation_settings(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    is_muted: bool | None = None,
    is_pinned: bool | None = None,
    theme_id: str | None = None,
) -> ConversationMember:
    """Update per-user conversation settings (mute, pin, theme)."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("Conversation membership not found.")

    if is_muted is not None:
        member.is_muted = is_muted
    if is_pinned is not None:
        member.is_pinned = is_pinned
    if theme_id is not None:
        member.theme_id = theme_id

    await db.flush()
    return member


async def _reload_conversation(db: AsyncSession, conv_id: uuid.UUID) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user).selectinload(User.profile),
        )
        .where(Conversation.id == conv_id)
    )
    return result.scalar_one()


async def assert_member(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ConversationMember:
    """Raise ValueError if user is not an accepted member."""
    result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted.is_(True),
            )
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ValueError("You are not a member of this conversation.")
    return member


# ──────────────────────────────────────────────────────────────────────────────
# Message operations
# ──────────────────────────────────────────────────────────────────────────────

async def _get_pinned_ids(db: AsyncSession, conversation_id: uuid.UUID) -> set[uuid.UUID]:
    result = await db.execute(
        select(PinnedMessage.message_id).where(
            PinnedMessage.conversation_id == conversation_id
        )
    )
    return set(result.scalars().all())


async def get_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    before: datetime.datetime | None = None,
    limit: int = 50,
) -> tuple[list[MessageDTO], bool]:
    """
    Return messages in reverse-chronological order (newest first when no cursor).
    Caller reverses to display oldest-at-top.
    Returns (messages, has_more).
    """
    await assert_member(db, conversation_id, user_id)

    query = (
        select(Message)
        .options(
            selectinload(Message.sender).selectinload(User.profile),
            selectinload(Message.reactions).selectinload(MessageReaction.user),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(
            and_(
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
            )
        )
        .order_by(Message.created_at.desc())
        .limit(limit + 1)
    )
    if before:
        query = query.where(Message.created_at < before)

    result = await db.execute(query)
    rows = result.scalars().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    pinned_ids = await _get_pinned_ids(db, conversation_id)
    dtos = [_build_message_dto(m, pinned_ids) for m in rows]
    return dtos, has_more


async def send_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    sender_id: uuid.UUID,
    content: str,
    content_type: MessageContentType = "text",
    client_message_id: str | None = None,
    reply_to_id: uuid.UUID | None = None,
    attachments: list[AttachmentDTO] | None = None,
) -> MessageDTO:
    await assert_member(db, conversation_id, sender_id)

    # Idempotency check
    if client_message_id:
        existing = await db.execute(
            select(Message).where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.client_message_id == client_message_id,
                )
            )
        )
        dup = existing.scalar_one_or_none()
        if dup:
            return await _load_message_dto(db, dup.id, conversation_id)

    ct = MessageContentTypeEnum(content_type)
    attachments_data = [a.model_dump() for a in attachments] if attachments else None

    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        client_message_id=client_message_id,
        content=content,
        content_type=ct,
        reply_to_id=reply_to_id,
        attachments=attachments_data,
    )
    db.add(msg)
    await db.flush()

    # Update conversation.updated_at
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = conv_result.scalar_one()
    conv.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()

    # Deliver receipts to online members (will be updated by WS layer)
    # Just create a receipt for sender as read
    sender_receipt = MessageReceipt(
        message_id=msg.id,
        user_id=sender_id,
        delivered_at=datetime.datetime.now(datetime.timezone.utc),
        read_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(sender_receipt)
    await db.flush()

    return await _load_message_dto(db, msg.id, conversation_id)


async def _load_message_dto(
    db: AsyncSession, message_id: uuid.UUID, conversation_id: uuid.UUID
) -> MessageDTO:
    result = await db.execute(
        select(Message)
        .options(
            selectinload(Message.sender).selectinload(User.profile),
            selectinload(Message.reactions).selectinload(MessageReaction.user),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(Message.id == message_id)
    )
    msg = result.scalar_one()
    pinned_ids = await _get_pinned_ids(db, conversation_id)
    return _build_message_dto(msg, pinned_ids)


async def edit_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    content: str,
) -> MessageDTO:
    result = await db.execute(
        select(Message).where(
            and_(
                Message.id == message_id,
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
            )
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise ValueError("Message not found.")
    if msg.sender_id != user_id:
        raise PermissionError("You can only edit your own messages.")
    if msg.is_recalled:
        raise ValueError("Cannot edit a recalled message.")

    msg.content = content
    msg.edited_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    return await _load_message_dto(db, message_id, conversation_id)


async def recall_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    delete_for_everyone: bool = True,
) -> MessageDTO:
    result = await db.execute(
        select(Message).where(
            and_(
                Message.id == message_id,
                Message.conversation_id == conversation_id,
                Message.deleted_at.is_(None),
            )
        )
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise ValueError("Message not found.")
    if msg.sender_id != user_id:
        raise PermissionError("You can only recall your own messages.")

    if delete_for_everyone:
        msg.is_recalled = True
        msg.content = "Tin nhắn đã bị thu hồi"
    else:
        msg.deleted_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()
    return await _load_message_dto(db, message_id, conversation_id)


async def react_to_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    emoji: str,
) -> MessageDTO:
    """Toggle: add reaction if not present, remove if already present."""
    await assert_member(db, conversation_id, user_id)

    result = await db.execute(
        select(MessageReaction).where(
            and_(
                MessageReaction.message_id == message_id,
                MessageReaction.user_id == user_id,
                MessageReaction.emoji == emoji,
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
    else:
        reaction = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji,
        )
        db.add(reaction)
    await db.flush()
    return await _load_message_dto(db, message_id, conversation_id)


async def pin_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    await assert_member(db, conversation_id, user_id)
    # Check if already pinned
    result = await db.execute(
        select(PinnedMessage).where(
            and_(
                PinnedMessage.conversation_id == conversation_id,
                PinnedMessage.message_id == message_id,
            )
        )
    )
    if result.scalar_one_or_none():
        return  # already pinned — idempotent

    db.add(PinnedMessage(
        conversation_id=conversation_id,
        message_id=message_id,
        pinned_by=user_id,
    ))
    await db.flush()


async def unpin_message(
    db: AsyncSession,
    message_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    await assert_member(db, conversation_id, user_id)
    await db.execute(
        delete(PinnedMessage).where(
            and_(
                PinnedMessage.conversation_id == conversation_id,
                PinnedMessage.message_id == message_id,
            )
        )
    )
    await db.flush()


async def get_pinned_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[MessageDTO]:
    await assert_member(db, conversation_id, user_id)

    result = await db.execute(
        select(PinnedMessage)
        .where(PinnedMessage.conversation_id == conversation_id)
        .order_by(PinnedMessage.pinned_at.desc())
    )
    pins = result.scalars().all()
    pinned_ids = {p.message_id for p in pins}

    if not pinned_ids:
        return []

    msg_result = await db.execute(
        select(Message)
        .options(
            selectinload(Message.sender).selectinload(User.profile),
            selectinload(Message.reactions).selectinload(MessageReaction.user),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(
            and_(
                Message.id.in_(pinned_ids),
                Message.deleted_at.is_(None),
            )
        )
        .order_by(Message.created_at.desc())
    )
    msgs = msg_result.scalars().all()
    return [_build_message_dto(m, pinned_ids) for m in msgs]


async def mark_conversation_read(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    last_read_message_id: uuid.UUID,
) -> None:
    """Set member.last_read_at to the timestamp of the specified message."""
    msg_result = await db.execute(
        select(Message.created_at).where(Message.id == last_read_message_id)
    )
    msg_ts = msg_result.scalar_one_or_none()
    if not msg_ts:
        return

    member_result = await db.execute(
        select(ConversationMember).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
    )
    member = member_result.scalar_one_or_none()
    if member:
        member.last_read_at = msg_ts
        await db.flush()


# ──────────────────────────────────────────────────────────────────────────────
# User lookup
# ──────────────────────────────────────────────────────────────────────────────

async def lookup_users(
    db: AsyncSession,
    query: str,
    exclude_user_id: uuid.UUID,
    limit: int = 10,
) -> list[UserLookupResult]:
    """Search users by display_name or email (case-insensitive, partial match)."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(
            and_(
                User.id != exclude_user_id,
                or_(
                    User.display_name.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%"),
                ),
            )
        )
        .limit(limit)
    )
    users = result.scalars().all()
    return [
        UserLookupResult(
            id=u.id,
            display_name=u.display_name,
            email=u.email,
            avatar_url=u.profile.avatar_url if u.profile else None,
        )
        for u in users
    ]

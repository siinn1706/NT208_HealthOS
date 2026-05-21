"""Chat REST endpoints — mounted at /v1/chat/*.

All business logic lives in app.services.chat; this module is a thin
routing + auth layer.  Error mapping:
  ValueError      → 400
  PermissionError → 403
"""
from __future__ import annotations

import datetime
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import User
from app.schemas.chat import (
    ConversationDTO,
    ConversationListResponse,
    ConversationResponse,
    ConversationSettingsBody,
    CreateDirectConversationBody,
    EditMessageBody,
    MarkReadBody,
    MessageListResponse,
    MessageResponse,
    PinnedMessageListResponse,
    ReactMessageBody,
    SendMessageBody,
    UserLookupResponse,
)
from app.services import chat as chat_svc
from app.ws.handlers import manager as ws_manager

router = APIRouter(prefix="/chat", tags=["Chat REST"])


def _err(status_code: int, code: str, msg: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": msg}},
    )


async def _notify_conversation(
    conversation_id: uuid.UUID,
    event: str,
    payload: dict,
) -> None:
    """Broadcast a WS event to all sockets joined to the conv:{id} room."""
    await ws_manager.broadcast(
        room=f"conv:{conversation_id}",
        message={
            "event": event,
            "payload": payload,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )


# ── Conversations ─────────────────────────────────────────────────────────────

@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or get a direct conversation",
)
async def create_direct_conversation(
    body: CreateDirectConversationBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    if body.target_user_id == current_user.id:
        raise _err(400, "CHAT_INVALID_TARGET", "Cannot start a conversation with yourself.")
    try:
        conv = await chat_svc.create_direct_conversation(db, current_user.id, body.target_user_id)
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))
    dto = await chat_svc._build_conversation_dto(db, conv, current_user.id)

    # Notify the target user in real time
    await ws_manager.send_to_user(
        user_id=str(body.target_user_id),
        message={
            "event": "conversation.updated",
            "payload": dto.model_dump(mode="json"),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )
    return ConversationResponse(data=dto)


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List accepted conversations",
)
async def list_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationListResponse:
    presence_map = ws_manager.get_presence_map()
    convs = await chat_svc.get_conversations(db, current_user.id, presence_map)
    return ConversationListResponse(data=convs, total=len(convs))


@router.get(
    "/conversations/pending",
    response_model=ConversationListResponse,
    summary="List pending conversation requests",
)
async def list_pending_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationListResponse:
    convs = await chat_svc.get_pending_conversations(db, current_user.id)
    return ConversationListResponse(data=convs, total=len(convs))


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get a single conversation",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    conv = await chat_svc.get_conversation_by_id(db, conversation_id, current_user.id)
    if conv is None:
        raise _err(404, "CHAT_NOT_FOUND", "Conversation not found.")
    dto = await chat_svc._build_conversation_dto(db, conv, current_user.id)
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/{conversation_id}/accept",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Accept a stranger conversation request",
)
async def accept_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.accept_conversation(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))


@router.post(
    "/conversations/{conversation_id}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Reject a stranger conversation request",
)
async def reject_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.reject_conversation(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="Get messages (cursor-based, newest-first)",
)
async def get_messages(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    before: Annotated[datetime.datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MessageListResponse:
    try:
        msgs, has_more = await chat_svc.get_messages(
            db, conversation_id, current_user.id, before=before, limit=limit
        )
    except ValueError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))
    next_cursor = msgs[-1].created_at.isoformat() if msgs and has_more else None
    return MessageListResponse(data=msgs, has_more=has_more, next_cursor=next_cursor)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a message (REST fallback; prefer WebSocket for real-time)",
)
async def send_message(
    conversation_id: uuid.UUID,
    body: SendMessageBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    try:
        msg = await chat_svc.send_message(
            db,
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=body.content,
            content_type=body.content_type,
            client_message_id=body.client_message_id,
            reply_to_id=body.reply_to_id,
            attachments=body.attachments,
        )
    except PermissionError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))

    await _notify_conversation(
        conversation_id, "chat.message.sent", msg.model_dump(mode="json")
    )
    return MessageResponse(data=msg)


@router.patch(
    "/conversations/{conversation_id}/messages/{message_id}",
    response_model=MessageResponse,
    summary="Edit a message",
)
async def edit_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    body: EditMessageBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    try:
        msg = await chat_svc.edit_message(
            db, message_id, conversation_id, current_user.id, body.content
        )
    except PermissionError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))

    await _notify_conversation(
        conversation_id, "chat.message.edited", msg.model_dump(mode="json")
    )
    return MessageResponse(data=msg)


@router.delete(
    "/conversations/{conversation_id}/messages/{message_id}",
    response_model=MessageResponse,
    summary="Recall (soft-delete) a message",
)
async def recall_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    for_everyone: Annotated[bool, Query()] = True,
) -> MessageResponse:
    try:
        msg = await chat_svc.recall_message(
            db, message_id, conversation_id, current_user.id, for_everyone
        )
    except PermissionError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))

    await _notify_conversation(
        conversation_id, "chat.message.recalled", msg.model_dump(mode="json")
    )
    return MessageResponse(data=msg)


@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/reactions",
    response_model=MessageResponse,
    summary="Toggle an emoji reaction on a message",
)
async def react_to_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    body: ReactMessageBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    try:
        msg = await chat_svc.react_to_message(
            db, message_id, conversation_id, current_user.id, body.emoji
        )
    except ValueError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))

    await _notify_conversation(
        conversation_id, "chat.message.reacted", msg.model_dump(mode="json")
    )
    return MessageResponse(data=msg)


@router.post(
    "/conversations/{conversation_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark messages as read up to a cursor",
)
async def mark_read(
    conversation_id: uuid.UUID,
    body: MarkReadBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await chat_svc.mark_conversation_read(
        db, conversation_id, current_user.id, body.last_read_message_id
    )
    await _notify_conversation(
        conversation_id,
        "chat.message.read",
        {
            "user_id": str(current_user.id),
            "last_read_message_id": str(body.last_read_message_id),
            "conversation_id": str(conversation_id),
        },
    )


@router.get(
    "/conversations/{conversation_id}/pinned",
    response_model=PinnedMessageListResponse,
    summary="Get pinned messages",
)
async def get_pinned_messages(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PinnedMessageListResponse:
    try:
        msgs = await chat_svc.get_pinned_messages(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _err(403, "CHAT_FORBIDDEN", str(exc))
    return PinnedMessageListResponse(data=msgs)


@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/pin",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Pin a message",
)
async def pin_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.pin_message(db, message_id, conversation_id, current_user.id)
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))


@router.delete(
    "/conversations/{conversation_id}/messages/{message_id}/pin",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unpin a message",
)
async def unpin_message(
    conversation_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.unpin_message(db, message_id, conversation_id, current_user.id)
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))


@router.patch(
    "/conversations/{conversation_id}/settings",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Update per-user conversation settings (mute, pin, theme)",
)
async def update_conversation_settings(
    conversation_id: uuid.UUID,
    body: ConversationSettingsBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.update_conversation_settings(
            db,
            conversation_id,
            current_user.id,
            is_muted=body.is_muted,
            is_pinned=body.is_pinned,
            theme_id=body.theme_id,
        )
    except ValueError as exc:
        raise _err(400, "CHAT_ERROR", str(exc))


# ── User lookup ───────────────────────────────────────────────────────────────

@router.get(
    "/users/search",
    response_model=UserLookupResponse,
    summary="Search users by display name or email",
)
async def search_users(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    q: Annotated[str, Query(min_length=1, max_length=100)] = "",
) -> UserLookupResponse:
    if not q.strip():
        return UserLookupResponse(data=[])
    results = await chat_svc.lookup_users(db, q.strip(), current_user.id)
    return UserLookupResponse(data=results)

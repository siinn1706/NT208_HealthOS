"""Conversations & messages REST endpoints.

URL structure follows docs/standards/api-conventions.md:
  /v1/conversations
  /v1/conversations/{conversation_id}/messages
  /v1/conversations/{conversation_id}/messages/{message_id}/reactions
  /v1/conversations/{conversation_id}/pinned
  /v1/users/lookup
"""
from __future__ import annotations

import datetime
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.models.core import (
    Conversation,
    ConversationTypeEnum,
    Message,
    MessageContentTypeEnum,
    MessageStatusEnum,
    User,
)
from app.services.ai_chat_stream import stream_assistant_response
from app.schemas.chat import (
    ConversationDTO,
    ConversationListResponse,
    ConversationSettingsBody,
    CreateAiConversationBody,
    CreateDirectConversationBody,
    CreateGroupConversationBody,
    EditMessageBody,
    MarkReadBody,
    MessageDTO,
    MessageListResponse,
    ReactMessageBody,
    SendMessageBody,
    ConversationResponse, 
    MessageResponse, 
    PinnedMessageListResponse,
    UserLookupResponse,
)
from app.schemas.common import ErrorResponse
from app.services import chat as chat_svc
from app.ws.handlers import manager as ws_manager

router = APIRouter(tags=["Chat"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _http_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"error": {"code": code, "message": message}},
    )

async def _notify_conversation(
    conversation_id: uuid.UUID,
    event: str,
    payload: dict,
) -> None:
    """Broadcast a WS event to all members of a conversation room."""
    import datetime as _dt
    await ws_manager.broadcast(
        room=f"conv:{conversation_id}",
        message={
            "event": event,
            "payload": payload,
            "timestamp": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        },
    )


# ─── Conversation endpoints ────────────────────────────────────────────────────

@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List my accepted conversations",
)
async def list_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationListResponse:
    # Get online presence from WS manager
    presence_map = ws_manager.get_presence_map()
    convs = await chat_svc.get_conversations(db, current_user.id, presence_map)
    return ConversationListResponse(data=convs, total=len(convs))


@router.get(
    "/conversations/pending",
    response_model=ConversationListResponse,
    responses={401: {"model": ErrorResponse}},
    summary="List pending (stranger) conversation requests",
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
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Get a single conversation",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    conv = await chat_svc.get_conversation_by_id(db, conversation_id, current_user.id)
    if conv is None:
        raise _http_error(404, "CHAT_NOT_FOUND", "Conversation not found.")

    # Require accepted membership for detail access
    try:
        await chat_svc.assert_member(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))

    presence_map = ws_manager.get_presence_map()
    return ConversationResponse(data=await chat_svc._build_conversation_dto(db, conv, current_user.id, presence_map))


@router.post(
    "/conversations/direct",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create or get a direct conversation",
)
async def create_direct_conversation(
    body: CreateDirectConversationBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    if body.target_user_id == current_user.id:
        raise _http_error(400, "CHAT_INVALID_TARGET", "Cannot start a conversation with yourself.")
    try:
        conv = await chat_svc.create_direct_conversation(db, current_user.id, body.target_user_id)
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()
    dto = await chat_svc._build_conversation_dto(db, conv, current_user.id)

    # Notify the target user that a new conversation was created
    await ws_manager.send_to_user(
        user_id=str(body.target_user_id),
        message={
            "event": "conversation.updated",
            "payload": dto.model_dump(mode="json"),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )
    return ConversationResponse(data=dto)


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create a group conversation",
)
async def create_group_conversation(
    body: CreateGroupConversationBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        conv = await chat_svc.create_group_conversation(
            db, current_user.id, body.title, body.member_ids, body.avatar_url
        )
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()
    dto = await chat_svc._build_conversation_dto(db, conv, current_user.id)

    # Notify each invited member (excluding the creator) so their client can
    # surface the pending group invite in real time — when require_accept is on
    # these members are is_accepted=False and won't poll the group otherwise.
    invitee_ids = {uid for uid in body.member_ids if uid != current_user.id}
    payload = dto.model_dump(mode="json")
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for uid in invitee_ids:
        await ws_manager.send_to_user(
            user_id=str(uid),
            message={
                "event": "conversation.updated",
                "payload": payload,
                "timestamp": ts,
            },
        )
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/ai",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create or get current user's AI conversation",
)
async def create_ai_conversation(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    body: CreateAiConversationBody | None = None,
) -> ConversationResponse:
    dto = await chat_svc.get_or_create_ai_conversation(
        db=db,
        user_id=current_user.id,
        initial_message=(body.initial_message if body else None),
        presence_map=ws_manager.get_presence_map(),
    )
    await db.commit()
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/{conversation_id}/accept",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Accept a pending conversation request",
)
async def accept_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.accept_conversation(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()


@router.post(
    "/conversations/{conversation_id}/reject",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Reject a pending conversation request",
)
async def reject_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.reject_conversation(db, conversation_id, current_user.id)
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()


@router.patch(
    "/conversations/{conversation_id}/settings",
    response_model=ConversationResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Update conversation settings (mute, pin, theme)",
)
async def update_conversation_settings(
    conversation_id: uuid.UUID,
    body: ConversationSettingsBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
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
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()
    conv = await chat_svc.get_conversation_by_id(db, conversation_id, current_user.id)
    if conv is None:
        raise _http_error(404, "CHAT_NOT_FOUND", "Conversation not found.")
    presence_map = ws_manager.get_presence_map()
    return ConversationResponse(data=await chat_svc._build_conversation_dto(db, conv, current_user.id, presence_map))


# ─── Message endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Get message history (cursor pagination, newest first)",
)
async def get_messages(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    before: Annotated[datetime.datetime | None, Query(description="Cursor: fetch messages before this ISO timestamp")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MessageListResponse:
    try:
        msgs, has_more = await chat_svc.get_messages(
            db, conversation_id, current_user.id, before, limit
        )
    except ValueError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))

    next_cursor = msgs[-1].created_at.isoformat() if msgs and has_more else None
    return MessageListResponse(data=msgs, has_more=has_more, next_cursor=next_cursor)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
    except (ValueError, PermissionError) as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    await db.commit()

    # Broadcast to all members in the conversation room
    await _notify_conversation(
        conversation_id,
        "chat.message.sent",
        msg.model_dump(mode="json"),
    )
    return MessageResponse(data=msg)


@router.post(
    "/conversations/{conversation_id}/messages/stream",
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
    summary="AI conversation streaming endpoint (Server-Sent Events).",
)
async def stream_message(
    conversation_id: uuid.UUID,
    body: SendMessageBody,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """B7 P6 — SSE pipe for AI replies.

    Persists the user's message synchronously, then streams an `assistant`
    delta sequence terminated by either `done` (success) or `aborted` /
    `error`. The streaming row's `status` column lets the FE distinguish
    a stopped reply from a completed one when re-loading the transcript.
    """
    conv = (
        await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    ).scalar_one_or_none()
    if conv is None:
        raise _http_error(404, "CHAT_NOT_FOUND", "Conversation not found.")
    if conv.type != ConversationTypeEnum.AI:
        raise _http_error(
            400,
            "STREAM_NOT_SUPPORTED",
            "Streaming is only available for AI conversations.",
        )
    try:
        await chat_svc.assert_member(db, conversation_id, current_user.id)
    except PermissionError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))

    # Persist the user message immediately (durable even if streaming dies).
    user_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        client_message_id=body.client_message_id,
        content=body.content,
        content_type=MessageContentTypeEnum(body.content_type or "text"),
        status=MessageStatusEnum.COMPLETED.value,
    )
    db.add(user_msg)
    await db.flush()
    user_msg_id = user_msg.id
    await db.commit()

    # B7 review P2-5 — generator owns its session lifecycle. We don't pass
    # `db` (the dep-injected one) so FastAPI can return the connection to
    # the pool the moment this handler returns.
    generator = stream_assistant_response(
        request=request,
        conversation_id=conversation_id,
        user_id=current_user.id,
        user_message_id=user_msg_id,
        prompt=body.content,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.patch(
    "/conversations/{conversation_id}/messages/{message_id}",
    response_model=MessageResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
        msg = await chat_svc.edit_message(db, message_id, conversation_id, current_user.id, body.content)
    except PermissionError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()

    await _notify_conversation(conversation_id, "chat.message.edited", msg.model_dump(mode="json"))
    return MessageResponse(data=msg)


@router.delete(
    "/conversations/{conversation_id}/messages/{message_id}",
    response_model=MessageResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    except ValueError as exc:
        raise _http_error(400, "CHAT_ERROR", str(exc))
    await db.commit()

    await _notify_conversation(conversation_id, "chat.message.recalled", msg.model_dump(mode="json"))
    return MessageResponse(data=msg)


# ─── Reaction endpoints ───────────────────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/messages/{message_id}/reactions",
    response_model=MessageResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
    except (ValueError, PermissionError) as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    await db.commit()

    await _notify_conversation(conversation_id, "chat.message.reacted", msg.model_dump(mode="json"))
    return MessageResponse(data=msg)


# ─── Pinned messages ───────────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}/pinned",
    response_model=PinnedMessageListResponse,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="List pinned messages in a conversation",
)
async def get_pinned_messages(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PinnedMessageListResponse:
    try:
        messages = await chat_svc.get_pinned_messages(db, conversation_id, current_user.id)
        return PinnedMessageListResponse(data=messages)
    except ValueError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))


@router.post(
    "/conversations/{conversation_id}/pinned/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    await db.commit()
    await _notify_conversation(
        conversation_id,
        "chat.message.pinned",
        {"message_id": str(message_id), "conversation_id": str(conversation_id)},
    )


@router.delete(
    "/conversations/{conversation_id}/pinned/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
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
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    await db.commit()
    await _notify_conversation(
        conversation_id,
        "chat.message.unpinned",
        {"message_id": str(message_id), "conversation_id": str(conversation_id)},
    )


# ─── Read receipt ──────────────────────────────────────────────────────────────

@router.post(
    "/conversations/{conversation_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={401: {"model": ErrorResponse}},
    summary="Mark messages as read up to a cursor",
)
async def mark_read(
    conversation_id: uuid.UUID,
    body: MarkReadBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.mark_conversation_read(
            db, conversation_id, current_user.id, body.last_read_message_id
        )
    except ValueError as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))
    await db.commit()
    # Notify room so senders see double-tick
    await _notify_conversation(
        conversation_id,
        "chat.message.read",
        {
            "user_id": str(current_user.id),
            "last_read_message_id": str(body.last_read_message_id),
            "conversation_id": str(conversation_id),
        },
    )


# ─── User lookup ───────────────────────────────────────────────────────────────

@router.get(
    "/users/lookup",
    response_model=UserLookupResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Search users by display name or email to start a conversation",
)
async def lookup_users(
    q: Annotated[str, Query(min_length=1, max_length=100, description="Search query")],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> UserLookupResponse:
    results = await chat_svc.lookup_users(db, q, current_user.id, limit)
    return UserLookupResponse(data=results)

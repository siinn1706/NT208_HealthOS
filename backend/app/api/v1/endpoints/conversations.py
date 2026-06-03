"""Conversations & messages REST endpoints.

URL structure follows docs/standards/api-conventions.md:
  /v1/conversations
  /v1/conversations/{conversation_id}/messages
  /v1/conversations/{conversation_id}/messages/{message_id}/reactions
  /v1/conversations/{conversation_id}/pinned
  /v1/users/lookup
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.database import AsyncSessionLocal, get_db
from app.adapters.storage import upload_file
from app.core.config import settings
from app.core.metrics import record_ws_fanout_failure
from app.core.rate_limit import rate_limit_conversation_create
from app.core.security import get_current_user
from app.exceptions import ApiException
from app.models.core import (
    Conversation,
    ConversationMember,
    ConversationTypeEnum,
    User,
    UserPreference,
)
from app.services.ai_chat_stream import stream_assistant_response
from app.schemas.chat import (
    AddMembersBody,
    AttachmentDTO,
    ChatAttachmentUploadResponse,
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
    SetMemberRoleBody,
    TransferOwnershipBody,
    UpdateGroupMetadataBody,
    ConversationResponse,
    MessageResponse,
    PinnedMessageListResponse,
    UserLookupResponse,
)
from app.schemas.common import ErrorResponse
from app.services import ai_bot, chat as chat_svc
from app.services.upload_security import (
    UploadTooLargeError,
    detect_image_mime,
    extension_for_mime,
    read_upload_bounded,
    sanitize_response_filename,
)
from app.ws.handlers import manager as ws_manager

router = APIRouter(tags=["Chat"])
_LOGGER = logging.getLogger("healthos.chat.api")
CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
CHAT_IMAGE_ALLOWED_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _http_error(status_code: int, code: str, message: str) -> ApiException:
    return ApiException(status_code=status_code, code=code, message=message)


def _chat_image_object_key(user_id: uuid.UUID, mime_type: str) -> str:
    ext = extension_for_mime(mime_type, fallback="bin")
    return f"chat-images/{user_id}/{uuid.uuid4()}.{ext}"


def _chat_image_display_name(filename: str | None, mime_type: str) -> str:
    fallback = f"chat-image.{extension_for_mime(mime_type, fallback='jpg')}"
    safe = sanitize_response_filename(filename, fallback=fallback)
    if "." not in safe:
        safe = f"{safe}.{extension_for_mime(mime_type, fallback='jpg')}"
    return safe


def _normalize_chat_locale(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    locale = value.strip().lower()
    if locale.startswith("en"):
        return "en"
    if locale.startswith("vi"):
        return "vi"
    return None


async def _resolve_chat_locale(db: AsyncSession, current_user: User) -> str:
    profile = getattr(current_user, "profile", None)
    profile_locale = _normalize_chat_locale(getattr(profile, "preferred_language", None))
    if profile_locale:
        return profile_locale

    result = await db.execute(
        select(UserPreference.locale).where(UserPreference.user_id == current_user.id)
    )
    pref_locale = _normalize_chat_locale(result.scalar_one_or_none())
    return pref_locale or "vi"


async def _notify_conversation(
    conversation_id: uuid.UUID,
    event: str,
    payload: dict,
) -> None:
    """Broadcast a WS event to all members of a conversation room."""
    await ws_manager.broadcast(
        room=f"conv:{conversation_id}",
        message={
            "event": event,
            "payload": payload,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )


async def _notify_conversation_members(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    event: str,
    payload: dict,
    *,
    exclude_user_id: uuid.UUID | None = None,
) -> None:
    """Per-user fanout for conv-list-impacting events.

    Sends one frame per online user socket via send_to_user, in addition to
    the room broadcast. Skips exclude_user_id (typically the sender).
    No-op for offline users — they resync via /v1/conversations on reconnect.
    """
    result = await db.execute(
        select(ConversationMember.user_id).where(
            and_(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.is_accepted.is_(True),
            )
        )
    )
    member_ids = [uid for uid in result.scalars().all() if uid != exclude_user_id]
    if not member_ids:
        return

    frame = {
        "event": event,
        "payload": payload,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    results = await asyncio.gather(
        *[
            ws_manager.send_to_user(str(uid), frame, raise_delivery_errors=True)
            for uid in member_ids
        ],
        return_exceptions=True,
    )
    fatal = [
        result for result in results
        if isinstance(result, BaseException) and not isinstance(result, Exception)
    ]
    if fatal:
        raise fatal[0]

    failures = [result for result in results if isinstance(result, Exception)]
    if failures:
        failure_types = {type(failure).__name__ for failure in failures}
        exception_type = next(iter(failure_types)) if len(failure_types) == 1 else "multiple"
        record_ws_fanout_failure(event, exception_type)
        _LOGGER.warning(
            "chat.fanout.failed",
            extra={
                "event_name": event,
                "conversation_id": str(conversation_id),
                "recipient_count": len(member_ids),
                "excluded_user_id": str(exclude_user_id) if exclude_user_id else None,
                "exception_type": exception_type,
            },
            exc_info=(type(failures[0]), failures[0], failures[0].__traceback__),
        )
        return

    _LOGGER.debug("chat.fanout conv_id=%s event=%s recipient_count=%d", conversation_id, event, len(member_ids))


# ─── Conversation endpoints ────────────────────────────────────────────────────

@router.post(
    "/conversations/uploads/image",
    response_model=ChatAttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
    },
    summary="Upload a chat image attachment",
)
async def upload_chat_image(
    current_user: Annotated[User, Depends(get_current_user)],
    image: UploadFile = File(...),
) -> ChatAttachmentUploadResponse:
    try:
        image_bytes = await read_upload_bounded(image, CHAT_IMAGE_MAX_BYTES)
    except UploadTooLargeError as exc:
        raise _http_error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "PAYLOAD_TOO_LARGE", str(exc)) from exc
    if not image_bytes:
        raise _http_error(status.HTTP_400_BAD_REQUEST, "EMPTY_FILE", "Uploaded image is empty.")

    mime_type = detect_image_mime(image_bytes[:32])
    if mime_type not in CHAT_IMAGE_ALLOWED_MIME_TYPES:
        raise _http_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_MEDIA_TYPE",
            "Only JPEG, PNG, and WEBP images are accepted.",
        )

    key = _chat_image_object_key(current_user.id, mime_type)
    url = upload_file(
        bucket=settings.storage_bucket_docs,
        key=key,
        file_bytes=image_bytes,
        content_type=mime_type,
    )
    attachment = AttachmentDTO(
        url=url,
        name=_chat_image_display_name(image.filename, mime_type),
        size=len(image_bytes),
        mime_type=mime_type,
    )
    return ChatAttachmentUploadResponse(data=attachment)


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
    # get_conversations ensures each user has a durable AI conversation.
    # Commit that side effect so the returned AI id remains valid for message
    # history and streaming requests after this GET request finishes.
    await db.commit()
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
    dependencies=[Depends(rate_limit_conversation_create)],
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
    dependencies=[Depends(rate_limit_conversation_create)],
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
    return ConversationResponse(data=await chat_svc._build_conversation_dto(db, conv, current_user.id))


@router.post(
    "/conversations/ai",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    summary="Create or get current user's AI conversation",
    dependencies=[Depends(rate_limit_conversation_create)],
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
    # Per-user fanout for members not joined to the room (e.g. on dashboard tab)
    await _notify_conversation_members(
        db, conversation_id, "chat.message.sent", msg.model_dump(mode="json"),
        exclude_user_id=current_user.id,
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
    """SSE pipe for AI replies.

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
    except (ValueError, PermissionError) as exc:
        raise _http_error(403, "CHAT_FORBIDDEN", str(exc))

    locale = _normalize_chat_locale(body.locale) or await _resolve_chat_locale(db, current_user)

    # Persist the user message immediately (durable even if streaming dies).
    try:
        user_msg = await chat_svc.send_message(
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
    user_msg_id = user_msg.id
    await db.commit()

    try:
        bot_id = await ai_bot.ensure_ai_bot_member(db, conversation_id)
        await db.commit()
    except RuntimeError:
        bot_id = None

    async def broadcast_assistant_message(msg: MessageDTO) -> None:
        payload = msg.model_dump(mode="json")
        async with AsyncSessionLocal() as fanout_db:
            await _notify_conversation_members(
                fanout_db,
                conversation_id,
                "chat.message.sent",
                payload,
                exclude_user_id=current_user.id,
            )

    # The generator owns its session lifecycle. We don't pass
    # `db` (the dep-injected one) so FastAPI can return the connection to
    # the pool the moment this handler returns.
    generator = stream_assistant_response(
        request=request,
        conversation_id=conversation_id,
        user_id=current_user.id,
        user_message_id=user_msg_id,
        prompt=body.content,
        assistant_sender_id=bot_id,
        locale=locale,
        broadcast_message=broadcast_assistant_message,
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
    await _notify_conversation_members(
        db, conversation_id, "chat.message.edited", msg.model_dump(mode="json"),
        exclude_user_id=current_user.id,
    )
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
    await _notify_conversation_members(
        db, conversation_id, "chat.message.recalled", msg.model_dump(mode="json"),
        exclude_user_id=current_user.id,
    )
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


# ─── Group management endpoints ────────────────────────────────────────────────

@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Update group title and/or avatar (owner/admin only)",
)
async def update_group_metadata(
    conversation_id: uuid.UUID,
    body: UpdateGroupMetadataBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        dto = await chat_svc.update_group_metadata(
            db, conversation_id, current_user.id, title=body.title, avatar_url=body.avatar_url
        )
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    conv_updated_dto = dto.model_dump(mode="json")
    await _notify_conversation(conversation_id, "chat.conversation.updated", conv_updated_dto)
    await _notify_conversation_members(db, conversation_id, "chat.conversation.updated", conv_updated_dto)
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/{conversation_id}/members",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Add members to a group conversation (owner/admin only)",
)
async def add_group_members(
    conversation_id: uuid.UUID,
    body: AddMembersBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        dto = await chat_svc.add_group_members(db, conversation_id, current_user.id, body.user_ids)
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    conv_data = dto.model_dump(mode="json")
    await _notify_conversation(conversation_id, "chat.conversation.updated", conv_data)
    await _notify_conversation_members(db, conversation_id, "chat.conversation.updated", conv_data)
    return ConversationResponse(data=dto)


@router.delete(
    "/conversations/{conversation_id}/members/{user_id}",
    response_model=ConversationResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Remove a member from a group conversation (owner/admin only)",
)
async def remove_group_member(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        dto = await chat_svc.remove_group_member(db, conversation_id, current_user.id, user_id)
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    conv_data = dto.model_dump(mode="json")
    # Notify the removed user, then evict their sockets from this room before
    # broadcasting future conversation events to remaining members.
    await ws_manager.send_to_user(
        str(user_id),
        {
            "event": "chat.conversation.removed",
            "payload": {"conversation_id": str(conversation_id)},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )
    ws_manager.leave_user_room(str(user_id), f"conv:{conversation_id}")
    await _notify_conversation(conversation_id, "chat.conversation.updated", conv_data)
    await _notify_conversation_members(db, conversation_id, "chat.conversation.updated", conv_data)
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/{conversation_id}/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Leave a group conversation",
)
async def leave_group(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    try:
        await chat_svc.leave_group(db, conversation_id, current_user.id)
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    await ws_manager.send_to_user(
        str(current_user.id),
        {
            "event": "chat.conversation.removed",
            "payload": {"conversation_id": str(conversation_id)},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },
    )
    ws_manager.leave_user_room(str(current_user.id), f"conv:{conversation_id}")
    await _notify_conversation(
        conversation_id,
        "chat.conversation.updated",
        {"conversation_id": str(conversation_id)},
    )
    await _notify_conversation_members(
        db, conversation_id, "chat.conversation.updated",
        {"conversation_id": str(conversation_id)},
    )


@router.post(
    "/conversations/{conversation_id}/members/{user_id}/role",
    response_model=ConversationResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Promote or demote a member's role (owner only)",
)
async def set_member_role(
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    body: SetMemberRoleBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        dto = await chat_svc.set_member_role(db, conversation_id, current_user.id, user_id, body.role)
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    conv_data = dto.model_dump(mode="json")
    await _notify_conversation(conversation_id, "chat.conversation.updated", conv_data)
    await _notify_conversation_members(db, conversation_id, "chat.conversation.updated", conv_data)
    return ConversationResponse(data=dto)


@router.post(
    "/conversations/{conversation_id}/transfer-owner",
    response_model=ConversationResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}},
    summary="Transfer group ownership to another member (owner only)",
)
async def transfer_ownership(
    conversation_id: uuid.UUID,
    body: TransferOwnershipBody,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    try:
        dto = await chat_svc.transfer_ownership(db, conversation_id, current_user.id, body.new_owner_id)
    except (ValueError, PermissionError) as exc:
        code = "CHAT_FORBIDDEN" if isinstance(exc, PermissionError) else "CHAT_ERROR"
        raise _http_error(403 if isinstance(exc, PermissionError) else 400, code, str(exc))
    await db.commit()
    conv_data = dto.model_dump(mode="json")
    await _notify_conversation(conversation_id, "chat.conversation.updated", conv_data)
    await _notify_conversation_members(db, conversation_id, "chat.conversation.updated", conv_data)
    return ConversationResponse(data=dto)


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

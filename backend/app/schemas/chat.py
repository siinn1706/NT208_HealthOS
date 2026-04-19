"""Pydantic schemas for the Chat feature — request bodies, DTOs, and WS event payloads."""
from __future__ import annotations

import datetime
import re
import uuid
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ──────────────────────────────────────────────────────────────────────────────
# Enums (string-literal style so they match DB enums without importing SA)
# ──────────────────────────────────────────────────────────────────────────────

ConversationType = Literal["direct", "group", "ai"]
MessageContentType = Literal["text", "image", "file", "audio", "system"]


# ──────────────────────────────────────────────────────────────────────────────
# Sub-DTOs
# ──────────────────────────────────────────────────────────────────────────────

class ParticipantDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    avatar_url: str | None = None
    is_online: bool = False
    last_seen_at: datetime.datetime | None = None
    role: str = "member"
    is_system: bool = False


class AttachmentDTO(BaseModel):
    # Restrict to https:// or relative paths to prevent XSS via javascript:/data: URLs
    url: str = Field(..., max_length=2048, pattern=r"^https?://")
    name: str = Field(..., max_length=255)
    size: int = Field(..., ge=0, le=104_857_600)  # max 100 MiB
    mime_type: str = Field(..., max_length=128)


class ReactionDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    emoji: str
    user_id: uuid.UUID
    user_display_name: str | None = None


class ReplyPreviewDTO(BaseModel):
    id: uuid.UUID
    sender_display_name: str | None = None
    content: str
    content_type: MessageContentType = "text"


# ──────────────────────────────────────────────────────────────────────────────
# Message DTOs
# ──────────────────────────────────────────────────────────────────────────────

class MessageDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID | None = None
    sender_display_name: str | None = None
    sender_avatar_url: str | None = None
    client_message_id: str | None = None
    content: str
    content_type: MessageContentType = "text"
    attachments: list[AttachmentDTO] | None = None
    reply_to_id: uuid.UUID | None = None
    reply_to: ReplyPreviewDTO | None = None
    is_recalled: bool = False
    reactions: list[ReactionDTO] = []
    is_pinned: bool = False
    created_at: datetime.datetime
    edited_at: datetime.datetime | None = None


# ──────────────────────────────────────────────────────────────────────────────
# Conversation DTOs
# ──────────────────────────────────────────────────────────────────────────────

class ConversationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: ConversationType
    title: str | None = None
    avatar_url: str | None = None
    participants: list[ParticipantDTO] = []
    last_message: MessageDTO | None = None
    unread_count: int = 0
    is_muted: bool = False
    is_pinned: bool = False
    theme_id: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class ConversationListResponse(BaseModel):
    data: list[ConversationDTO]
    total: int


# ──────────────────────────────────────────────────────────────────────────────
# Message list / pagination
# ──────────────────────────────────────────────────────────────────────────────

class MessageListResponse(BaseModel):
    data: list[MessageDTO]
    has_more: bool
    next_cursor: str | None = None  # ISO datetime string of oldest returned message


# ──────────────────────────────────────────────────────────────────────────────
# Request bodies
# ──────────────────────────────────────────────────────────────────────────────

class CreateDirectConversationBody(BaseModel):
    target_user_id: uuid.UUID


class CreateGroupConversationBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    member_ids: list[uuid.UUID] = Field(..., min_length=1)
    avatar_url: str | None = None


class SendMessageBody(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)
    content_type: MessageContentType = "text"
    client_message_id: str | None = Field(None, max_length=128)
    reply_to_id: uuid.UUID | None = None
    attachments: list[AttachmentDTO] | None = Field(None, max_length=10)


class EditMessageBody(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)


class ReactMessageBody(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=64)
    
    @field_validator("emoji")
    @classmethod
    def validate_emoji_chars(cls, v: str) -> str:
        # Allow only Unicode emoji characters (no HTML/script tags)
        if re.search(r'[<>&"\']', v):
            raise ValueError("emoji must not contain HTML characters")
        return v


class MarkReadBody(BaseModel):
    last_read_message_id: uuid.UUID


class ConversationSettingsBody(BaseModel):
    is_muted: bool | None = None
    is_pinned: bool | None = None
    theme_id: str | None = None


# ──────────────────────────────────────────────────────────────────────────────
# User lookup
# ──────────────────────────────────────────────────────────────────────────────

class UserLookupResult(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None = None


class UserLookupResponse(BaseModel):
    data: list[UserLookupResult]


# ──────────────────────────────────────────────────────────────────────────────
# WebSocket event envelope & payloads
# ──────────────────────────────────────────────────────────────────────────────

class WsEventEnvelope(BaseModel):
    """Base envelope for all WS events sent by the server."""
    event: str
    payload: dict[str, Any]
    timestamp: str  # ISO 8601


# Client → Server event bodies (parsed from incoming WS JSON)

class WsSendMessage(BaseModel):
    conversation_id: uuid.UUID
    client_message_id: str | None = None
    content: str = Field(..., min_length=1, max_length=4096)
    content_type: MessageContentType = "text"
    reply_to_id: uuid.UUID | None = None
    attachments: list[AttachmentDTO] | None = Field(None, max_length=10)


class WsEditMessage(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str = Field(..., min_length=1, max_length=4096)


class WsDeleteMessage(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    delete_for_everyone: bool = False


class WsReactMessage(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    emoji: str


class WsPinMessage(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID


class WsMarkRead(BaseModel):
    conversation_id: uuid.UUID
    last_read_message_id: uuid.UUID


class WsTyping(BaseModel):
    conversation_id: uuid.UUID
    is_typing: bool


class WsJoinConversation(BaseModel):
    conversation_id: uuid.UUID


class WsConvSync(BaseModel):
    conversation_id: uuid.UUID
    after_message_id: uuid.UUID | None = None
    limit: int = Field(default=50, ge=1, le=100)

# ──────────────────────────────────────────────────────────────────────────────
# Standardized API Responses
# ──────────────────────────────────────────────────────────────────────────────

class ConversationResponse(BaseModel):
    data: ConversationDTO

class MessageResponse(BaseModel):
    data: MessageDTO

class PinnedMessageListResponse(BaseModel):
    data: list[MessageDTO]
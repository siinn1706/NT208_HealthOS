"""Request/response schemas for AI chat completion."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ChatRole = Literal["user", "assistant", "system"]


class ChatTurn(BaseModel):
    """A single turn in the conversation history sent to the LLM."""

    role: ChatRole
    content: str = Field(min_length=1, max_length=8192)


class ChatRequest(BaseModel):
    """Input payload from Core BE to /api/ai/chat (and /api/ai/chat/stream)."""

    model_config = ConfigDict(extra="ignore")

    messages: list[ChatTurn] = Field(default_factory=list)
    system_prompt: str = Field(default="", max_length=8192)
    user_context: dict[str, Any] | None = None
    rag_context: dict[str, Any] | None = None
    safety_context: dict[str, Any] | None = None
    model: str | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=16, le=8192)
    locale: str = Field(default="vi", max_length=8)


class ChatUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatReply(BaseModel):
    """Non-streaming response payload returned to Core BE."""

    reply: str
    model: str
    usage: ChatUsage = Field(default_factory=ChatUsage)
    finish_reason: str = "stop"
    safety_blocked: bool = False
    latency_ms: int = 0

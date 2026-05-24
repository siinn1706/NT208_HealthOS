"""Pydantic schemas for the onboarding draft endpoint."""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict


_MAX_DRAFT_BYTES = 64 * 1024  # 64 KiB


class OnboardingDraftPutBody(BaseModel):
    data: dict[str, Any]


class OnboardingDraftData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    data: dict[str, Any]
    updated_at: datetime
    expires_at: datetime


class OnboardingDraftResponse(BaseModel):
    data: OnboardingDraftData


async def enforce_max_draft_size(request: Request) -> None:
    """Reject PUT bodies above 64 KiB before parsing."""
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > _MAX_DRAFT_BYTES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "PAYLOAD_TOO_LARGE", "message": "Draft payload exceeds 64 KiB limit."},
        )

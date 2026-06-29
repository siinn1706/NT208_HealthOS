from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import DataResponse

ShareChannelLiteral = Literal["email", "in_app", "sms"]
ShareStatusLiteral = Literal["sent", "failed", "skipped"]

_PHONE_RE = re.compile(r"^\+?[0-9][0-9\s().-]{4,19}$")


class ShareRecipient(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=320)
    phone: Optional[str] = Field(default=None, max_length=32)
    relationship: Optional[str] = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        normalized = v.strip()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("invalid email address")
        return normalized

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        normalized = v.strip()
        if not normalized:
            return None
        if not _PHONE_RE.match(normalized):
            raise ValueError("invalid phone number")
        return normalized


class ShareReportRequest(BaseModel):
    report_id: str = Field(..., min_length=1, max_length=200)
    recipients: list[ShareRecipient] = Field(..., min_length=1, max_length=20)
    channels: list[ShareChannelLiteral] = Field(..., min_length=1)
    message: Optional[str] = Field(default=None, max_length=2000)
    include_pdf: bool = False
    # `period` lets the backend re-render the report PDF; `locale` selects the
    # email / in-app / SMS language. Both default safely.
    period: str = Field(default="7d", pattern="^(7d|30d|90d)$")
    locale: str = Field(default="vi", pattern="^(vi|en)$")


class ShareResultItem(BaseModel):
    recipient: ShareRecipient
    channel: ShareChannelLiteral
    status: ShareStatusLiteral
    error_message: Optional[str] = None


class ShareReportResponse(DataResponse[list[ShareResultItem]]):
    ...

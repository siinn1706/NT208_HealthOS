"""B7 P10 — Pydantic schemas for the PDF report export pipeline."""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


# Periods supported by the existing reports endpoint (matches `services/insights.py`).
SUPPORTED_PERIODS = frozenset({"7d", "30d", "90d"})

# Section keys mirror what the FE chooses in the dialog.
SUPPORTED_SECTIONS = frozenset(
    {"vitals", "nutrition", "activity", "sleep", "bmi", "medication"}
)


class ReportExportRequestBody(BaseModel):
    period: str = Field(default="30d", pattern="^(7d|30d|90d)$")
    sections: list[str] = Field(min_length=1, max_length=20)
    locale: str = Field(default="en", pattern="^(en|vi)$")
    include_sensitive: bool = False


class ReportExportRequestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    period: str
    sections: list[str]
    locale: str
    include_sensitive: bool
    requested_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    bytes: Optional[int] = None
    error: Optional[str] = None


class ReportExportRequestResponse(DataResponse[ReportExportRequestDTO]):
    ...


class ReportExportSignedUrlData(BaseModel):
    url: str
    expires_in_s: int = Field(ge=1)
    bytes: int = Field(ge=0)
    expires_at: datetime.datetime


class ReportExportSignedUrlResponse(DataResponse[ReportExportSignedUrlData]):
    ...

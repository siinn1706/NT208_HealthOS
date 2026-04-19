"""B7 P8 — Pydantic schemas for the GDPR-style data export pipeline."""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


class DataExportRequestDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    requested_at: datetime.datetime
    completed_at: Optional[datetime.datetime] = None
    expires_at: Optional[datetime.datetime] = None
    bytes: Optional[int] = None
    error: Optional[str] = None


class DataExportRequestResponse(DataResponse[DataExportRequestDTO]):
    ...


class DataExportSignedUrlData(BaseModel):
    url: str
    expires_in_s: int = Field(ge=1)
    bytes: int = Field(ge=0)
    expires_at: datetime.datetime


class DataExportSignedUrlResponse(DataResponse[DataExportSignedUrlData]):
    ...

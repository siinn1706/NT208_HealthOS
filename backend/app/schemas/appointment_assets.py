"""Generic appointment asset schemas."""
from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


class AppointmentAssetKind(str, Enum):
    ATTACHMENT = "attachment"
    LAB_REPORT = "lab_report"


class AppointmentAssetDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    kind: AppointmentAssetKind
    mime_type: str
    size_bytes: int
    sha256: str
    original_filename: Optional[str] = None
    uploaded_at: datetime.datetime


class AppointmentAssetListResponse(DataResponse[list[AppointmentAssetDTO]]):
    ...


class AppointmentAssetResponse(DataResponse[AppointmentAssetDTO]):
    ...


class SignedAppointmentAssetUrlData(BaseModel):
    url: str
    expires_in_s: int = Field(ge=1)
    mime_type: str
    original_filename: Optional[str] = None


class SignedAppointmentAssetUrlResponse(DataResponse[SignedAppointmentAssetUrlData]):
    ...

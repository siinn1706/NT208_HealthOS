"""B7 P4 — Prescription assets schemas.

Note: list/details responses NEVER include the signed URL. Clients always make
a separate per-asset call to mint a fresh 5-minute URL — keeps URLs out of
caches/logs and bounds the blast radius of a leaked envelope.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


class PrescriptionAssetDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    mime_type: str
    size_bytes: int
    sha256: str
    original_filename: Optional[str] = None
    uploaded_at: datetime.datetime


class PrescriptionAssetListResponse(DataResponse[list[PrescriptionAssetDTO]]):
    ...


class PrescriptionAssetResponse(DataResponse[PrescriptionAssetDTO]):
    ...


class SignedAssetUrlData(BaseModel):
    url: str
    expires_in_s: int = Field(ge=1)
    mime_type: str
    original_filename: Optional[str] = None


class SignedAssetUrlResponse(DataResponse[SignedAssetUrlData]):
    ...

from __future__ import annotations

import datetime
import uuid
from enum import Enum
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import DataResponse, PaginatedResponse


class PrescriptionMedicine(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    notes: str | None = None


class PrescriptionPayload(BaseModel):
    id: str
    issued_at: datetime.datetime | None = None
    doctor: str | None = None
    clinic: str | None = None
    diagnosis: str | None = None
    medicines: list[PrescriptionMedicine] = Field(default_factory=list)
    notes: str | None = None


class AppointmentVisitType(str, Enum):
    IN_PERSON = "in_person"
    VIDEO = "video"


def _normalize_visit_type(value: object) -> object:
    if value == "in-person":
        return AppointmentVisitType.IN_PERSON.value
    return value


def _normalize_video_join_url(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("video_join_url must be an absolute http(s) URL.")
    trimmed = value.strip()
    if not trimmed:
        return None
    parsed = urlparse(trimmed)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("video_join_url must be an absolute http(s) URL.")
    return trimmed


class AppointmentDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_date: datetime.datetime
    doctor_name: str
    specialty: str | None = None
    clinic: str | None = None
    diagnosis: str | None = None
    visit_type: AppointmentVisitType = AppointmentVisitType.IN_PERSON
    video_join_url: str | None = None
    status: str
    notes: str | None = None
    has_prescription: bool = False
    prescription: PrescriptionPayload | None = None


class AppointmentCreateBody(BaseModel):
    appointment_date: datetime.datetime
    doctor_name: str = Field(min_length=1, max_length=255)
    specialty: str | None = Field(default=None, max_length=128)
    clinic: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=2000)
    visit_type: AppointmentVisitType = AppointmentVisitType.IN_PERSON
    video_join_url: str | None = Field(default=None, max_length=2048)

    @field_validator("visit_type", mode="before")
    @classmethod
    def normalize_visit_type(cls, value: object) -> object:
        return _normalize_visit_type(value)

    @field_validator("video_join_url", mode="before")
    @classmethod
    def normalize_video_join_url(cls, value: object) -> str | None:
        return _normalize_video_join_url(value)


class AppointmentUpdateBody(BaseModel):
    appointment_date: datetime.datetime | None = None
    doctor_name: str | None = Field(default=None, min_length=1, max_length=255)
    specialty: str | None = Field(default=None, max_length=128)
    clinic: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=2000)
    visit_type: AppointmentVisitType | None = None
    video_join_url: str | None = Field(default=None, max_length=2048)

    @field_validator("visit_type", mode="before")
    @classmethod
    def normalize_visit_type(cls, value: object) -> object:
        return _normalize_visit_type(value)

    @field_validator("video_join_url", mode="before")
    @classmethod
    def normalize_video_join_url(cls, value: object) -> str | None:
        return _normalize_video_join_url(value)


class AppointmentStatusUpdateBody(BaseModel):
    status: str = Field(
        pattern=r"^(booked|scheduled|upcoming|in_progress|completed|cancelled|no_show|rescheduled)$",
    )


class AppointmentResponse(DataResponse[AppointmentDTO]):
    ...


class AppointmentListResponse(PaginatedResponse[AppointmentDTO]):
    ...


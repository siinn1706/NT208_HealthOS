from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

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


class AppointmentDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_date: datetime.datetime
    doctor_name: str
    specialty: str | None = None
    clinic: str | None = None
    diagnosis: str | None = None
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


class AppointmentUpdateBody(BaseModel):
    appointment_date: datetime.datetime | None = None
    doctor_name: str | None = Field(default=None, min_length=1, max_length=255)
    specialty: str | None = Field(default=None, max_length=128)
    clinic: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentStatusUpdateBody(BaseModel):
    status: str = Field(
        pattern=r"^(booked|scheduled|upcoming|in_progress|completed|cancelled|no_show|rescheduled)$",
    )


class AppointmentResponse(DataResponse[AppointmentDTO]):
    ...


class AppointmentListResponse(PaginatedResponse[AppointmentDTO]):
    ...


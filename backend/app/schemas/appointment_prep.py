from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


class AppointmentPrepChecklistItem(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=160)
    checked: bool = False


class AppointmentPrepDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    appointment_id: uuid.UUID
    checklist_items: list[AppointmentPrepChecklistItem] = Field(default_factory=list)
    notes: str | None = None
    updated_at: datetime.datetime | None = None


class AppointmentPrepUpdateBody(BaseModel):
    checklist_items: list[AppointmentPrepChecklistItem] | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)


class AppointmentPrepResponse(DataResponse[AppointmentPrepDTO]):
    ...

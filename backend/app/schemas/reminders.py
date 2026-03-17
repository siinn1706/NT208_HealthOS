from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DataResponse


class ReminderDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    time: str
    repeat: str
    done: bool
    note: str | None = None


class ReminderCreateBody(BaseModel):
    type: str = Field(pattern="^(medicine|appointment|exercise)$")
    title: str = Field(min_length=1, max_length=255)
    time: str = Field(min_length=1, max_length=16)
    repeat: str = Field(default="once", pattern="^(once|daily|weekly|monthly)$")
    note: str | None = Field(default=None, max_length=2000)


class ReminderUpdateBody(BaseModel):
    done: bool


class ReminderResponse(DataResponse[ReminderDTO]):
    ...


class ReminderListResponse(DataResponse[list[ReminderDTO]]):
    ...


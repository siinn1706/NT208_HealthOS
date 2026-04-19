from __future__ import annotations

import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.common import DataResponse


class ReminderDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    time: str
    repeat: str
    done: bool
    note: Optional[str] = None
    # B7 — schedule extensions (all optional for back-compat with legacy rows).
    tzid: str = "Asia/Ho_Chi_Minh"
    weekday_mask: Optional[int] = None
    day_of_month: Optional[int] = None
    next_occurrence_at: Optional[datetime.datetime] = None


class ReminderCreateBody(BaseModel):
    type: str = Field(pattern="^(medicine|appointment|exercise)$")
    title: str = Field(min_length=1, max_length=255)
    time: str = Field(min_length=1, max_length=16, pattern=r"^\d{2}:\d{2}$")
    repeat: str = Field(default="once", pattern="^(once|daily|weekly|monthly)$")
    note: Optional[str] = Field(default=None, max_length=2000)
    # B7 schedule fields — opt-in, all default to "use the legacy daily-style behavior".
    tzid: Optional[str] = Field(default=None, max_length=64)
    weekday_mask: Optional[int] = Field(default=None, ge=0, le=127)
    day_of_month: Optional[int] = Field(default=None, ge=-1, le=31)
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None

    @model_validator(mode="after")
    def _check_repeat_consistency(self) -> "ReminderCreateBody":
        if self.repeat == "weekly" and self.weekday_mask in (None, 0):
            # Allow a weekly reminder without a mask — services backfill it
            # using the start_date day-of-week. Leaving this lenient avoids
            # breaking the existing FE which doesn't expose the bitmap yet.
            pass
        if self.repeat == "monthly" and (self.day_of_month is None or self.day_of_month == 0):
            # Same lenience as above.
            pass
        return self


class ReminderUpdateBody(BaseModel):
    done: bool


class ReminderSkipBody(BaseModel):
    occurrence_id: Optional[uuid.UUID] = None


class ReminderSnoozeBody(BaseModel):
    """Either `until` (ISO 8601 absolute) OR `minutes` (relative). Mutually exclusive."""

    occurrence_id: Optional[uuid.UUID] = None
    until: Optional[datetime.datetime] = None
    minutes: Optional[int] = Field(default=None, ge=1, le=24 * 60)

    @model_validator(mode="after")
    def _exactly_one(self) -> "ReminderSnoozeBody":
        if self.until is None and self.minutes is None:
            raise ValueError("Provide either `until` or `minutes`.")
        if self.until is not None and self.minutes is not None:
            raise ValueError("Provide only one of `until` or `minutes`, not both.")
        return self


class ReminderDoneBody(BaseModel):
    occurrence_id: Optional[uuid.UUID] = None


class ReminderOccurrenceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reminder_id: uuid.UUID
    title: str
    type: str
    scheduled_at: datetime.datetime
    status: str
    snoozed_until: Optional[datetime.datetime] = None
    done_at: Optional[datetime.datetime] = None
    skipped_at: Optional[datetime.datetime] = None


class ReminderOccurrenceListResponse(DataResponse[list[ReminderOccurrenceDTO]]):
    ...


class ReminderOccurrenceResponse(DataResponse[ReminderOccurrenceDTO]):
    ...


class ReminderResponse(DataResponse[ReminderDTO]):
    ...


class ReminderListResponse(DataResponse[list[ReminderDTO]]):
    ...


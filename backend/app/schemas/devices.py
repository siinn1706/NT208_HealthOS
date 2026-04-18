from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, Field

from app.schemas.common import DataResponse


class ConnectedDeviceDTO(BaseModel):
    id: uuid.UUID
    provider: str
    name: str
    model: str | None = None
    connected: bool
    last_sync: datetime.datetime | None = None
    battery_pct: int | None = None


class DeviceConnectBody(BaseModel):
    provider: str = Field(pattern="^(apple_health|google_fit|garmin|fitbit)$")
    model: str | None = Field(default=None, max_length=128)


class ConnectedDeviceResponse(DataResponse[ConnectedDeviceDTO]):
    ...


class ConnectedDeviceListResponse(DataResponse[list[ConnectedDeviceDTO]]):
    ...


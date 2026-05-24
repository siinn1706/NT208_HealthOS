from __future__ import annotations

import datetime
import uuid

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.schemas.common import DataResponse


# Closed vocabulary of Health Connect record-type strings the mobile is
# allowed to declare as scopes. Matches `mobile/src/healthconnect/types.ts`.
# Anything outside this set is rejected at the schema layer so the column
# can never grow unbounded JSON or hostile XSS payloads.
_HC_RECORD_TYPES = {
    "Steps",
    "HeartRate",
    "SleepSession",
    "Weight",
    "BloodPressure",
    "ExerciseSession",
}


def _validate_scopes(value: list[str] | None) -> list[str] | None:
    if value is None:
        return None
    if len(value) > 20:
        raise ValueError("scopes length exceeds 20 items")
    cleaned: list[str] = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError("scope items must be strings")
        if item not in _HC_RECORD_TYPES:
            raise ValueError(f"unknown HC record type: {item}")
        cleaned.append(item)
    return cleaned


class ConnectedDeviceDTO(BaseModel):
    id: uuid.UUID
    provider: str
    name: str
    model: str | None = None
    connected: bool
    last_sync: datetime.datetime | None = None
    battery_pct: int | None = None
    # Health Connect additions — null for legacy stub providers.
    device_label: str | None = None
    # Always serialized as null — the Google OAuth sub is an internal
    # identifier that must not be exposed in API responses.
    external_account_id: str | None = None
    scopes: list[str] | None = None
    last_sync_status: str | None = None
    last_sync_error: str | None = None
    last_sync_count: int | None = None
    last_attempted_at: datetime.datetime | None = None

    @field_serializer("external_account_id")
    def _redact_external_account_id(self, _value: str | None) -> None:
        return None


class DeviceConnectBody(BaseModel):
    # Pattern includes `health_connect`. Garmin/Fitbit remain in the picker
    # for backward compatibility but stay sync-stubs (no real ingestion).
    provider: str = Field(pattern="^(apple_health|google_fit|garmin|fitbit|health_connect)$")
    model: str | None = Field(default=None, max_length=128)
    device_label: str | None = Field(default=None, max_length=128)
    external_account_id: str | None = Field(default=None, max_length=128)
    # Granted record-type scopes when provider="health_connect", e.g.
    # ["Steps","HeartRate","SleepSession","Weight"]. Service layer
    # normalizes/filters; missing or empty is allowed (the user may grant
    # nothing yet, which is rendered as "permission_denied").
    scopes: list[str] | None = None

    @field_validator("scopes")
    @classmethod
    def _check_scopes(cls, v: list[str] | None) -> list[str] | None:
        return _validate_scopes(v)


class ConnectedDeviceResponse(DataResponse[ConnectedDeviceDTO]):
    ...


class ConnectedDeviceListResponse(DataResponse[list[ConnectedDeviceDTO]]):
    ...


class DevicePermissionsBody(BaseModel):
    """Body of PATCH /v1/devices/{id}/permissions.

    Used by the mobile foreground hook when it detects an out-of-band
    permission change in Health Connect (user revoked or re-granted via
    Android Settings). The mobile sends the CURRENT granted set; the
    backend replaces `scopes` and recomputes `last_sync_status`.
    """

    scopes: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("scopes")
    @classmethod
    def _check_scopes(cls, v: list[str]) -> list[str]:
        cleaned = _validate_scopes(v) or []
        return cleaned


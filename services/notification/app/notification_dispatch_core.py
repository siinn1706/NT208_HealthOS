"""Vendored copy of the notification dispatch core for the notification microservice.

This is a standalone copy so the microservice container can run without importing
the full backend tree. Keep in sync with backend/app/services/notification_dispatch.py.
A third consumer would justify extracting a shared package.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

_SCHEMA_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "..", "contracts", "events", "notification-requested.json",
)

try:
    import jsonschema as _jsonschema
    with open(os.path.normpath(_SCHEMA_PATH)) as _f:
        _ENVELOPE_SCHEMA = json.load(_f)
    _JSONSCHEMA_AVAILABLE = True
except Exception:
    _JSONSCHEMA_AVAILABLE = False
    _ENVELOPE_SCHEMA = {}


class EnvelopeValidationError(ValueError):
    pass


@dataclass
class ChannelResult:
    channel: str
    status: str
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"channel": self.channel, "status": self.status}
        if self.error:
            d["error"] = self.error
        return d


@dataclass
class DispatchResult:
    event_id: str
    results: list[ChannelResult] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"event_id": self.event_id, "results": [r.to_dict() for r in self.results]}


def validate_envelope(event: dict) -> None:
    if _JSONSCHEMA_AVAILABLE:
        try:
            _jsonschema.validate(instance=event, schema=_ENVELOPE_SCHEMA)
        except _jsonschema.ValidationError as exc:
            raise EnvelopeValidationError(str(exc.message)) from None
    else:
        for key in ("event", "version", "payload", "metadata"):
            if key not in event:
                raise EnvelopeValidationError(f"Missing required key: {key}")
        if event.get("event") != "notification.requested":
            raise EnvelopeValidationError("event must be 'notification.requested'")
        if "event_id" not in event.get("metadata", {}):
            raise EnvelopeValidationError("metadata.event_id is required")


def dispatch(event: dict) -> DispatchResult:
    validate_envelope(event)
    metadata = event.get("metadata", {})
    payload = event.get("payload", {})
    event_id = metadata.get("event_id", "")
    channels: list[str] = payload.get("channels", [])

    result = DispatchResult(event_id=event_id)
    for channel in channels:
        result.results.append(
            ChannelResult(
                channel=channel,
                status="provider_missing",
                error="http_gateway_no_adapters",
            )
        )
    return result

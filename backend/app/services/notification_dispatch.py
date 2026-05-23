"""Notification dispatch core — validate, fan-out, aggregate results.

PHI safety: log lines NEVER include recipient email/phone/push_token, template
variables, or rendered subject/body. Only event_id, correlation_id, user_id,
channel, template.id, priority, channel status, and error class name are logged.

logger.exception() is BANNED in this module — it auto-includes exc.args which
can contain PHI from the envelope. Use logger.error() with explicit fields only.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Contract path (resolved at import time) ──────────────────────────────────
import json
import os
_SCHEMA_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "..", "..", "contracts", "events", "notification-requested.json",
)

try:
    import jsonschema as _jsonschema
    with open(os.path.normpath(_SCHEMA_PATH)) as _f:
        _ENVELOPE_SCHEMA = json.load(_f)
    _JSONSCHEMA_AVAILABLE = True
except Exception:
    _JSONSCHEMA_AVAILABLE = False
    _ENVELOPE_SCHEMA = {}


# ── Exceptions ────────────────────────────────────────────────────────────────

class EnvelopeValidationError(ValueError):
    """Raised when the notification.requested envelope fails JSON Schema validation."""


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class ChannelResult:
    channel: str
    status: str  # delivered | provider_missing | failed
    error: Optional[str] = None  # error class name only, never message

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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _strip_crlf(s: str) -> str:
    return s.replace("\r", "").replace("\n", "")


def validate_envelope(event: dict) -> None:
    """Raise EnvelopeValidationError if the event does not match the contract."""
    if _JSONSCHEMA_AVAILABLE:
        try:
            _jsonschema.validate(instance=event, schema=_ENVELOPE_SCHEMA)
        except _jsonschema.ValidationError as exc:
            raise EnvelopeValidationError(str(exc.message)) from None
    else:
        # Minimal structural check when jsonschema is unavailable
        for key in ("event", "version", "payload", "metadata"):
            if key not in event:
                raise EnvelopeValidationError(f"Missing required key: {key}")
        if event.get("event") != "notification.requested":
            raise EnvelopeValidationError("event must be 'notification.requested'")
        if "event_id" not in event.get("metadata", {}):
            raise EnvelopeValidationError("metadata.event_id is required")


# ── Channel dispatchers ───────────────────────────────────────────────────────

def _dispatch_in_app(payload: dict, metadata: dict, db=None) -> ChannelResult:
    """Insert a Notification row using a sync Session (Celery-safe)."""
    channel = "in_app"
    event_id = metadata.get("event_id", "")
    try:
        user_id_str = payload.get("recipient", {}).get("user_id")
        if not user_id_str:
            return ChannelResult(channel=channel, status="failed", error="MissingRecipientUserId")

        template = payload.get("template", {})
        variables = template.get("variables") or {}
        title = variables.get("subject") or template.get("id", "Notification")
        body = variables.get("text_body") or f"{template.get('id', 'notification')}"

        if db is not None:
            session = db
            own_session = False
        else:
            from app.adapters.database import get_sync_db_context
            own_session = True

        from app.models.core import Notification

        if own_session:
            from app.adapters.database import get_sync_db_context
            with get_sync_db_context() as session:
                notif = Notification(
                    user_id=uuid.UUID(user_id_str),
                    title=_strip_crlf(title)[:255],
                    body=_strip_crlf(body)[:2000],
                    kind=template.get("id", "info")[:32],
                )
                session.add(notif)
                session.flush()
        else:
            notif = Notification(
                user_id=uuid.UUID(user_id_str),
                title=_strip_crlf(title)[:255],
                body=_strip_crlf(body)[:2000],
                kind=template.get("id", "info")[:32],
            )
            db.add(notif)
            db.flush()

        logger.info("channel=in_app status=delivered event_id=%s user_id=%s", event_id, user_id_str)
        return ChannelResult(channel=channel, status="delivered")

    except Exception as exc:
        logger.error(
            "channel=in_app status=failed event_id=%s exc=%s",
            event_id,
            type(exc).__name__,
        )
        return ChannelResult(channel=channel, status="failed", error=type(exc).__name__)


def _dispatch_email(payload: dict, metadata: dict) -> ChannelResult:
    """Send via SMTP. Returns provider_missing when SMTP is unconfigured or recipient email absent."""
    channel = "email"
    event_id = metadata.get("event_id", "")
    try:
        from app.core.config import settings
        from app.adapters import email_client

        recipient_email = payload.get("recipient", {}).get("email")
        smtp_ready = bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)

        if not smtp_ready or not recipient_email:
            reason = "smtp_not_configured" if not smtp_ready else "no_recipient_email"
            logger.info("channel=email status=provider_missing event_id=%s reason=%s", event_id, reason)
            return ChannelResult(channel=channel, status="provider_missing", error=reason)

        template = payload.get("template", {})
        variables = template.get("variables") or {}
        subject = _strip_crlf(variables.get("subject") or f"HealthOS — {template.get('id', 'notification')}")
        text_body = variables.get("text_body") or f"{template.get('id', 'notification')}"
        html_body = variables.get("html_body")

        email_client.send_email(
            to_email=recipient_email,
            subject=subject,
            text_body=_strip_crlf(text_body),
            html_body=_strip_crlf(html_body) if html_body else None,
        )

        logger.info("channel=email status=delivered event_id=%s", event_id)
        return ChannelResult(channel=channel, status="delivered")

    except Exception as exc:
        logger.error(
            "channel=email status=failed event_id=%s exc=%s",
            event_id,
            type(exc).__name__,
        )
        return ChannelResult(channel=channel, status="failed", error=type(exc).__name__)


def _dispatch_push(payload: dict, metadata: dict) -> ChannelResult:
    event_id = metadata.get("event_id", "")
    logger.info("channel=push status=provider_missing event_id=%s", event_id)
    return ChannelResult(channel="push", status="provider_missing", error="push_adapter_not_configured")


def _dispatch_sms(payload: dict, metadata: dict) -> ChannelResult:
    event_id = metadata.get("event_id", "")
    logger.info("channel=sms status=provider_missing event_id=%s", event_id)
    return ChannelResult(channel="sms", status="provider_missing", error="sms_adapter_not_configured")


_CHANNEL_HANDLERS = {
    "in_app": _dispatch_in_app,
    "email": _dispatch_email,
    "push": _dispatch_push,
    "sms": _dispatch_sms,
}


# ── Public entry point ────────────────────────────────────────────────────────

def dispatch(event: dict, db=None) -> DispatchResult:
    """Validate and fan-out a notification.requested event.

    `db` is an optional sync Session for the in_app channel; if None the
    dispatcher opens its own session via get_sync_db_context.

    Producers that only need in_app can still call services.notifications.enqueue
    directly — the dispatcher is for multi-channel fan-out.
    """
    validate_envelope(event)

    metadata = event.get("metadata", {})
    payload = event.get("payload", {})
    event_id = metadata.get("event_id", "")
    channels: list[str] = payload.get("channels", [])

    result = DispatchResult(event_id=event_id)
    for channel in channels:
        handler = _CHANNEL_HANDLERS.get(channel)
        if handler is None:
            result.results.append(
                ChannelResult(channel=channel, status="provider_missing", error="unknown_channel")
            )
            continue
        try:
            if channel == "in_app":
                ch_result = handler(payload, metadata, db)
            else:
                ch_result = handler(payload, metadata)
        except Exception as exc:
            logger.error(
                "channel=%s status=failed event_id=%s exc=%s",
                channel,
                event_id,
                type(exc).__name__,
            )
            ch_result = ChannelResult(channel=channel, status="failed", error=type(exc).__name__)
        result.results.append(ch_result)

    return result

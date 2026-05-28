"""Notification dispatch core: validate, fan out, and aggregate results.

PHI safety: log lines never include recipient email/phone/push token or rendered
message bodies. Only event_id, user_id, channel, status, and reason class are
logged here.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import Any

logger = logging.getLogger(__name__)


class EnvelopeValidationError(ValueError):
    """Raised when a notification dispatch request is missing required fields."""


@dataclass(frozen=True)
class NormalizedNotification:
    event_id: str
    recipient_id: str
    recipient_email: str | None
    title: str
    body: str
    channels: list[str]
    kind: str


@dataclass
class ChannelResult:
    channel: str
    status: str
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"channel": self.channel, "status": self.status}
        if self.reason:
            data["reason"] = self.reason
        return data


@dataclass
class DispatchResult:
    event_id: str
    results: list[ChannelResult] = field(default_factory=list)

    @property
    def status(self) -> str:
        statuses = {result.status for result in self.results}
        if not statuses:
            return "failed"
        if statuses == {"delivered"}:
            return "delivered"
        if statuses == {"skipped"}:
            return "skipped"
        if statuses == {"failed"}:
            return "failed"
        return "partial"

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "event_id": self.event_id,
            "status": self.status,
            "results": [result.to_dict() for result in self.results],
        }
        if len(self.results) == 1:
            only = self.results[0]
            data["channel"] = only.channel
            if only.reason:
                data["reason"] = only.reason
        return data


def _strip_crlf(value: str) -> str:
    return value.replace("\r", "").replace("\n", "")


def _string(value: object | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _mapping(value: object | None) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _channels(raw: object | None) -> list[str]:
    if isinstance(raw, str):
        values = [raw]
    elif isinstance(raw, list):
        values = [_string(item) for item in raw]
    else:
        values = []

    normalized = [
        item.lower().replace("-", "_")
        for item in values
        if item
    ]
    return normalized


def _first_string(*values: object | None) -> str | None:
    for value in values:
        text = _string(value)
        if text:
            return text
    return None


def normalize_event(event: dict[str, Any]) -> NormalizedNotification:
    metadata = _mapping(event.get("metadata"))
    payload = _mapping(event.get("payload"))
    recipient = _mapping(event.get("recipient")) or _mapping(payload.get("recipient"))
    template = _mapping(event.get("template")) or _mapping(payload.get("template"))
    variables = _mapping(template.get("variables")) or _mapping(payload.get("variables"))

    event_id = _first_string(event.get("event_id"), metadata.get("event_id"))
    recipient_id = _first_string(
        event.get("recipient_id"),
        event.get("user_id"),
        recipient.get("user_id"),
        recipient.get("id"),
        metadata.get("user_id"),
    )
    title = _first_string(
        event.get("title"),
        payload.get("title"),
        variables.get("title"),
        variables.get("subject"),
        template.get("id"),
    )
    body = _first_string(
        event.get("body"),
        event.get("message"),
        payload.get("body"),
        payload.get("message"),
        variables.get("body"),
        variables.get("message"),
        variables.get("text_body"),
    )
    channels = _channels(
        event.get("channel")
        or event.get("channels")
        or payload.get("channel")
        or payload.get("channels")
    )

    missing = [
        name
        for name, value in (
            ("event_id", event_id),
            ("recipient_id", recipient_id),
            ("title", title),
            ("body", body),
            ("channel", channels),
        )
        if not value
    ]
    if missing:
        raise EnvelopeValidationError(f"Missing required field(s): {', '.join(missing)}")

    return NormalizedNotification(
        event_id=event_id or "",
        recipient_id=recipient_id or "",
        recipient_email=_first_string(event.get("email"), recipient.get("email")),
        title=title or "",
        body=body or "",
        channels=channels,
        kind=_first_string(event.get("kind"), payload.get("kind"), template.get("id")) or "info",
    )


def _emit_in_app_realtime(notification: Any) -> None:
    notification_id = getattr(notification, "id", None)
    if notification_id is None:
        return
    try:
        from app.services.notifications import emit_notification_created

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(emit_notification_created(notification))
        else:
            loop.create_task(emit_notification_created(notification))
    except Exception as exc:
        logger.debug("notification dispatch websocket fanout failed: %s", type(exc).__name__)


def _dispatch_in_app(notification: NormalizedNotification, db=None) -> ChannelResult:
    channel = "in_app"
    try:
        from app.models.core import Notification

        user_id = uuid.UUID(notification.recipient_id)
        title = _strip_crlf(notification.title)[:255]
        body = _strip_crlf(notification.body)[:2000]
        kind = _strip_crlf(notification.kind)[:32] or "info"
        persisted = Notification(user_id=user_id, title=title, body=body, kind=kind)

        if db is not None:
            db.add(persisted)
            db.flush()
            realtime_notification = None
        else:
            from app.adapters.database import get_sync_db_context

            with get_sync_db_context() as session:
                session.add(persisted)
                session.flush()
                realtime_notification = SimpleNamespace(
                    id=persisted.id,
                    user_id=persisted.user_id,
                    kind=persisted.kind,
                    created_at=persisted.created_at,
                )

        if realtime_notification is not None:
            _emit_in_app_realtime(realtime_notification)
        logger.info(
            "channel=in_app status=delivered event_id=%s user_id=%s",
            notification.event_id,
            notification.recipient_id,
        )
        return ChannelResult(channel=channel, status="delivered")
    except ValueError:
        logger.info("channel=in_app status=failed event_id=%s reason=invalid_recipient_id", notification.event_id)
        return ChannelResult(channel=channel, status="failed", reason="invalid_recipient_id")
    except Exception as exc:
        logger.error(
            "channel=in_app status=failed event_id=%s exc=%s",
            notification.event_id,
            type(exc).__name__,
        )
        return ChannelResult(channel=channel, status="failed", reason=type(exc).__name__)


def _dispatch_email(notification: NormalizedNotification) -> ChannelResult:
    channel = "email"
    try:
        from app.adapters import email_client
        from app.core.config import settings

        if not notification.recipient_email:
            return ChannelResult(channel=channel, status="skipped", reason="missing_recipient_email")

        smtp_ready = bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)
        if not smtp_ready:
            return ChannelResult(channel=channel, status="skipped", reason="smtp_not_configured")

        email_client.send_email(
            to_email=notification.recipient_email,
            subject=_strip_crlf(notification.title),
            text_body=_strip_crlf(notification.body),
            html_body=None,
        )
        logger.info("channel=email status=delivered event_id=%s", notification.event_id)
        return ChannelResult(channel=channel, status="delivered")
    except Exception as exc:
        logger.error(
            "channel=email status=failed event_id=%s exc=%s",
            notification.event_id,
            type(exc).__name__,
        )
        return ChannelResult(channel=channel, status="failed", reason=type(exc).__name__)


def _dispatch_push(notification: NormalizedNotification) -> ChannelResult:
    logger.info("channel=push status=skipped event_id=%s reason=provider_not_configured", notification.event_id)
    return ChannelResult(channel="push", status="skipped", reason="provider_not_configured")


def _dispatch_sms(notification: NormalizedNotification) -> ChannelResult:
    logger.info("channel=sms status=skipped event_id=%s reason=provider_not_configured", notification.event_id)
    return ChannelResult(channel="sms", status="skipped", reason="provider_not_configured")


_CHANNEL_HANDLERS = {
    "in_app": _dispatch_in_app,
    "email": _dispatch_email,
    "push": _dispatch_push,
    "sms": _dispatch_sms,
}


def dispatch(event: dict[str, Any], db=None) -> DispatchResult:
    notification = normalize_event(event)
    result = DispatchResult(event_id=notification.event_id)

    for channel in notification.channels:
        handler = _CHANNEL_HANDLERS.get(channel)
        if handler is None:
            result.results.append(
                ChannelResult(channel=channel, status="skipped", reason="unsupported_channel")
            )
            continue
        try:
            if channel == "in_app":
                channel_result = handler(notification, db)
            else:
                channel_result = handler(notification)
        except Exception as exc:
            logger.error(
                "channel=%s status=failed event_id=%s exc=%s",
                channel,
                notification.event_id,
                type(exc).__name__,
            )
            channel_result = ChannelResult(channel=channel, status="failed", reason=type(exc).__name__)
        result.results.append(channel_result)

    return result

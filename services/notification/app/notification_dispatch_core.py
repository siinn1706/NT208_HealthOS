"""Standalone notification dispatch core for the notification microservice.

Core BE owns in-app persistence through `backend/app/tasks/notification_dispatch.py`.
This service provides the same validation/result contract and a real optional
SMTP dispatch path for demo use.
"""
from __future__ import annotations

import logging
import os
import smtplib
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import Any

logger = logging.getLogger(__name__)


class EnvelopeValidationError(ValueError):
    pass


@dataclass(frozen=True)
class NormalizedNotification:
    event_id: str
    recipient_id: str
    recipient_email: str | None
    title: str
    body: str
    channels: list[str]


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


def _mapping(value: object | None) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _string(value: object | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _first_string(*values: object | None) -> str | None:
    for value in values:
        text = _string(value)
        if text:
            return text
    return None


def _channels(raw: object | None) -> list[str]:
    if isinstance(raw, str):
        values = [raw]
    elif isinstance(raw, list):
        values = [_string(item) for item in raw]
    else:
        values = []
    return [item.lower().replace("-", "_") for item in values if item]


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
    )


def _dispatch_email(notification: NormalizedNotification) -> ChannelResult:
    channel = "email"
    host = _string(os.getenv("SMTP_HOST"))
    port = int(os.getenv("SMTP_PORT", "587"))
    user = _string(os.getenv("SMTP_USER"))
    password = _string(os.getenv("SMTP_PASSWORD"))
    sender = _string(os.getenv("SMTP_FROM")) or user
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() not in {"0", "false", "no"}

    if not notification.recipient_email:
        return ChannelResult(channel=channel, status="skipped", reason="missing_recipient_email")
    if not host or not sender:
        return ChannelResult(channel=channel, status="skipped", reason="smtp_not_configured")

    try:
        msg = EmailMessage()
        msg["From"] = sender
        msg["To"] = notification.recipient_email
        msg["Subject"] = _strip_crlf(notification.title)
        msg.set_content(_strip_crlf(notification.body))

        with smtplib.SMTP(host, port, timeout=10) as smtp:
            if use_tls:
                smtp.starttls()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)

        logger.info("channel=email status=delivered event_id=%s", notification.event_id)
        return ChannelResult(channel=channel, status="delivered")
    except Exception as exc:
        logger.error("channel=email status=failed event_id=%s exc=%s", notification.event_id, type(exc).__name__)
        return ChannelResult(channel=channel, status="failed", reason=type(exc).__name__)


def _dispatch_in_app(notification: NormalizedNotification) -> ChannelResult:
    logger.info("channel=in_app status=skipped event_id=%s reason=core_backend_persists_in_app", notification.event_id)
    return ChannelResult(channel="in_app", status="skipped", reason="core_backend_persists_in_app")


def _dispatch_push(notification: NormalizedNotification) -> ChannelResult:
    logger.info("channel=push status=skipped event_id=%s reason=provider_not_configured", notification.event_id)
    return ChannelResult(channel="push", status="skipped", reason="provider_not_configured")


def _dispatch_sms(notification: NormalizedNotification) -> ChannelResult:
    logger.info("channel=sms status=skipped event_id=%s reason=provider_not_configured", notification.event_id)
    return ChannelResult(channel="sms", status="skipped", reason="provider_not_configured")


_CHANNEL_HANDLERS = {
    "email": _dispatch_email,
    "in_app": _dispatch_in_app,
    "push": _dispatch_push,
    "sms": _dispatch_sms,
}


def dispatch(event: dict[str, Any]) -> DispatchResult:
    notification = normalize_event(event)
    result = DispatchResult(event_id=notification.event_id)

    for channel in notification.channels:
        handler = _CHANNEL_HANDLERS.get(channel)
        if handler is None:
            result.results.append(ChannelResult(channel=channel, status="skipped", reason="unsupported_channel"))
            continue
        try:
            result.results.append(handler(notification))
        except Exception as exc:
            logger.error("channel=%s status=failed event_id=%s exc=%s", channel, notification.event_id, type(exc).__name__)
            result.results.append(ChannelResult(channel=channel, status="failed", reason=type(exc).__name__))

    return result

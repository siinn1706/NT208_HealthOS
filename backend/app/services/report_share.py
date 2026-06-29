"""Share a generated health report with recipients over email / in-app / SMS.

PHI safety: log lines never include recipient email/phone/name or the message
body — only channel, status, and a coarse reason class.

This service does not touch wearable/device sync. Email goes to external contacts
via SMTP (optionally with the rendered report PDF attached); in-app notifications
are created only for recipients who already have a HealthOS account (resolved by
email); SMS is delivered via Twilio when a phone number is supplied. All copy is
bilingual (vi default, en) — never hardcoded to a single language.
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters import email_client, sms_client
from app.core.config import settings
from app.models.core import Notification, User
from app.schemas.report_share import ShareRecipient, ShareReportRequest, ShareResultItem

logger = logging.getLogger(__name__)

_NOTIFICATION_KIND = "report_share"

# Bilingual copy. {name} = sharer display name, {msg} = the optional personal note.
_STRINGS: dict[str, dict[str, str]] = {
    "vi": {
        "default_name": "Một người dùng HealthOS",
        "email_subject": "{name} đã chia sẻ báo cáo sức khoẻ với bạn",
        "greeting": "Xin chào,",
        "email_intro": "{name} vừa chia sẻ một báo cáo sức khoẻ với bạn qua HealthOS.",
        "message_label": "Lời nhắn:",
        "pdf_note": "Báo cáo chi tiết được đính kèm trong tệp PDF.",
        "email_outro": "Vui lòng liên hệ trực tiếp với họ nếu bạn cần thêm thông tin.",
        "signature": "— HealthOS",
        "in_app_title": "Báo cáo sức khoẻ được chia sẻ",
        "in_app_body": "{name} đã chia sẻ một báo cáo sức khoẻ với bạn.",
        "in_app_message": "Lời nhắn: {msg}",
        "sms_body": "{name} đã chia sẻ báo cáo sức khoẻ với bạn qua HealthOS.",
    },
    "en": {
        "default_name": "A HealthOS user",
        "email_subject": "{name} shared a health report with you",
        "greeting": "Hello,",
        "email_intro": "{name} has shared a health report with you via HealthOS.",
        "message_label": "Message:",
        "pdf_note": "The full report is attached as a PDF.",
        "email_outro": "Please contact them directly if you need more information.",
        "signature": "— HealthOS",
        "in_app_title": "A health report was shared with you",
        "in_app_body": "{name} shared a health report with you.",
        "in_app_message": "Message: {msg}",
        "sms_body": "{name} shared a health report with you via HealthOS.",
    },
}


def _t(locale: str, key: str) -> str:
    table = _STRINGS.get(locale, _STRINGS["vi"])
    return table.get(key) or _STRINGS["vi"][key]


def _smtp_ready() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _compose_email(name: str, message: str | None, locale: str, with_pdf: bool) -> tuple[str, str]:
    subject = _t(locale, "email_subject").format(name=name)
    lines = [_t(locale, "greeting"), "", _t(locale, "email_intro").format(name=name)]
    if message:
        lines += ["", _t(locale, "message_label"), message.strip()]
    if with_pdf:
        lines += ["", _t(locale, "pdf_note")]
    lines += ["", _t(locale, "email_outro"), "", _t(locale, "signature")]
    return subject, "\n".join(lines)


def _compose_in_app(name: str, message: str | None, locale: str) -> tuple[str, str]:
    body = _t(locale, "in_app_body").format(name=name)
    if message:
        body = f"{body} " + _t(locale, "in_app_message").format(msg=message.strip())
    return _t(locale, "in_app_title"), body


def _compose_sms(name: str, message: str | None, locale: str) -> str:
    body = _t(locale, "sms_body").format(name=name)
    if message:
        body = f"{body} {message.strip()}"
    return body


async def _render_report_pdf(user_id: uuid.UUID, period: str, locale: str) -> bytes | None:
    """Render the report PDF, degrading to None on any failure (e.g. WeasyPrint
    or its Cairo/Pango deps not installed) so a share never hard-fails on PDF."""
    try:
        from app.schemas.report_export import SUPPORTED_SECTIONS
        from app.tasks.report_pdf import _build_snapshot_async, _render_html, _render_pdf_bytes

        snapshot = await _build_snapshot_async(user_id, period)
        params = {
            "locale": locale,
            "include_sensitive": False,
            "sections": sorted(SUPPORTED_SECTIONS),
            "audit_id": "report-share",
        }
        html = _render_html(snapshot, params)
        return await asyncio.to_thread(_render_pdf_bytes, html)
    except Exception as exc:  # noqa: BLE001 — PDF attachment is best-effort
        logger.warning("report share PDF render skipped: %s", type(exc).__name__)
        return None


async def _deliver_email(
    recipient: ShareRecipient,
    smtp_ready: bool,
    subject: str,
    body: str,
    attachments: list[tuple[str, bytes, str, str]] | None,
) -> ShareResultItem:
    channel = "email"
    if not smtp_ready:
        return ShareResultItem(
            recipient=recipient, channel=channel, status="skipped", error_message="email_not_configured"
        )
    try:
        await asyncio.to_thread(
            email_client.send_email, recipient.email, subject, body, None, attachments
        )
        logger.info("channel=email status=sent kind=report_share has_pdf=%s", bool(attachments))
        return ShareResultItem(recipient=recipient, channel=channel, status="sent")
    except Exception as exc:  # noqa: BLE001 — reported per-recipient
        logger.warning("channel=email status=failed kind=report_share exc=%s", type(exc).__name__)
        return ShareResultItem(
            recipient=recipient, channel=channel, status="failed", error_message="send_failed"
        )


def _build_in_app(
    db: AsyncSession,
    recipient: ShareRecipient,
    user_id: uuid.UUID | None,
    title: str,
    body: str,
) -> tuple[ShareResultItem, Notification | None]:
    channel = "in_app"
    if user_id is None:
        return (
            ShareResultItem(
                recipient=recipient, channel=channel, status="skipped", error_message="recipient_not_registered"
            ),
            None,
        )
    notification = Notification(user_id=user_id, title=title[:255], body=body[:2000], kind=_NOTIFICATION_KIND)
    db.add(notification)
    logger.info("channel=in_app status=sent kind=report_share")
    return (ShareResultItem(recipient=recipient, channel=channel, status="sent"), notification)


async def _deliver_sms(recipient: ShareRecipient, sms_ready: bool, body: str) -> ShareResultItem:
    channel = "sms"
    if not sms_ready:
        return ShareResultItem(
            recipient=recipient, channel=channel, status="skipped", error_message="sms_not_configured"
        )
    if not recipient.phone:
        return ShareResultItem(
            recipient=recipient, channel=channel, status="skipped", error_message="missing_phone"
        )
    try:
        await asyncio.to_thread(sms_client.send_sms, recipient.phone, body)
        logger.info("channel=sms status=sent kind=report_share")
        return ShareResultItem(recipient=recipient, channel=channel, status="sent")
    except Exception as exc:  # noqa: BLE001 — reported per-recipient
        logger.warning("channel=sms status=failed kind=report_share exc=%s", type(exc).__name__)
        return ShareResultItem(
            recipient=recipient, channel=channel, status="failed", error_message="send_failed"
        )


async def _emit_realtime(notification: Notification) -> None:
    try:
        from app.services.notifications import emit_notification_created

        await emit_notification_created(notification)
    except Exception as exc:  # noqa: BLE001 — realtime fanout is best-effort
        logger.debug("report share realtime emit failed: %s", type(exc).__name__)


async def share_report(
    db: AsyncSession,
    sharer: User,
    payload: ShareReportRequest,
) -> list[ShareResultItem]:
    """Fan a report-share request out to each recipient × channel.

    Returns one ShareResultItem per (recipient, channel) pair. The caller commits
    the session (in-app notifications are added but not committed here).
    """
    locale = payload.locale
    sharer_name = (sharer.display_name or sharer.username or "").strip() or _t(locale, "default_name")

    # Resolve which recipients already have a HealthOS account (for in_app).
    emails = {r.email.strip().lower() for r in payload.recipients}
    user_by_email: dict[str, uuid.UUID] = {}
    if emails:
        rows = (
            await db.execute(
                select(User.id, func.lower(User.email)).where(func.lower(User.email).in_(list(emails)))
            )
        ).all()
        user_by_email = {email: user_id for user_id, email in rows}

    # Render the PDF once (only if requested and email is actually a channel).
    pdf_bytes: bytes | None = None
    if payload.include_pdf and "email" in payload.channels:
        pdf_bytes = await _render_report_pdf(sharer.id, payload.period, locale)
    attachments = (
        [(f"healthos-report-{payload.period}.pdf", pdf_bytes, "application", "pdf")] if pdf_bytes else None
    )

    email_subject, email_body = _compose_email(sharer_name, payload.message, locale, with_pdf=bool(attachments))
    in_app_title, in_app_body = _compose_in_app(sharer_name, payload.message, locale)
    sms_body = _compose_sms(sharer_name, payload.message, locale)

    smtp_ready = _smtp_ready()
    sms_ready = sms_client.is_configured()

    results: list[ShareResultItem] = []
    pending_realtime: list[Notification] = []

    for recipient in payload.recipients:
        registered_id = user_by_email.get(recipient.email.strip().lower())
        for channel in payload.channels:
            if channel == "email":
                results.append(
                    await _deliver_email(recipient, smtp_ready, email_subject, email_body, attachments)
                )
            elif channel == "in_app":
                item, notification = _build_in_app(db, recipient, registered_id, in_app_title, in_app_body)
                results.append(item)
                if notification is not None:
                    pending_realtime.append(notification)
            elif channel == "sms":
                results.append(await _deliver_sms(recipient, sms_ready, sms_body))
            else:  # pragma: no cover — schema restricts channels to the known set
                results.append(
                    ShareResultItem(
                        recipient=recipient, channel=channel, status="skipped", error_message="unsupported_channel"
                    )
                )

    if pending_realtime:
        await db.flush()
        for notification in pending_realtime:
            await _emit_realtime(notification)

    return results

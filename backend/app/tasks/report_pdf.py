"""B7 P10 — Celery task that renders a HealthReport snapshot as PDF.

B7 review P1-9: the task receives only `(user_id, request_id)` and rebuilds
the snapshot inside the worker (via `services/insights.get_health_report`)
through a fresh async session. The previous design serialised the entire
snapshot through the broker — a real risk for 90-day reports — and
double-counted DB load anyway because the endpoint had to build the
snapshot before queueing the task.

Rendering uses WeasyPrint when available (rich CSS). On import failure the
task records `status='failed'` with a clear message — operators see exactly
why and can install the system deps (Cairo / Pango).
"""
from __future__ import annotations

import asyncio
import datetime
import logging
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.adapters.database import AsyncSessionLocal, get_sync_db_context
from app.adapters.storage import sha256_hex, upload_file
from app.core.config import settings
from app.core.metrics import time_pdf_render
from app.models.core import (
    Notification,
    NotificationKindEnum,
    ReportExportRequest,
    User,
)
from app.tasks import celery_app
from app.templates.reports.i18n import i18n_for

logger = logging.getLogger(__name__)


EXPORT_TTL = datetime.timedelta(hours=24)
TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "reports" / "health-report.html.j2"


def _render_html(report_snapshot: dict, params: dict) -> str:
    from jinja2 import Environment, FileSystemLoader, select_autoescape

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_PATH.parent)),
        autoescape=select_autoescape(["html", "j2"]),
    )
    template = env.get_template(TEMPLATE_PATH.name)
    return template.render(report=report_snapshot, params=params, i18n=i18n_for(params["locale"]))


def _render_pdf_bytes(html: str) -> bytes:
    """Render `html` to PDF bytes via WeasyPrint.

    WeasyPrint pulls in Cairo/Pango at import time on most distros; if those
    are missing the import will raise and the caller surfaces a friendly
    `status='failed'` row.
    """
    from weasyprint import HTML  # noqa: WPS433 — defer heavy import to task time

    return HTML(string=html).write_pdf()


def _coerce_to_jsonable(value):
    """Pydantic / dict / list / datetime → JSON-safe primitives."""
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_coerce_to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _coerce_to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


async def _build_snapshot_async(user_id: uuid.UUID, period: str) -> dict[str, Any]:
    """Run the async `get_health_report` against a fresh session.

    Called from the sync Celery worker via `asyncio.run`. The async session
    is opened inside this coroutine so its event loop matches `asyncio.run`'s.
    """
    from app.services import insights as insight_svc
    from sqlalchemy.orm import selectinload

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).options(selectinload(User.profile)).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise RuntimeError(f"User {user_id} not found while building report snapshot")
        snapshot = await insight_svc.get_health_report(db, user, period)
        return _coerce_to_jsonable(snapshot)


@celery_app.task(name="app.tasks.report_pdf.render_health_report_pdf", bind=True, max_retries=2)
def render_health_report_pdf(self, user_id: str, request_id: str) -> dict:
    user_uuid = uuid.UUID(user_id)
    request_uuid = uuid.UUID(request_id)

    with get_sync_db_context() as db:
        req = db.get(ReportExportRequest, request_uuid)
        if req is None:
            return {"status": "missing"}
        if req.user_id != user_uuid:
            logger.warning(
                "render_health_report_pdf: user_id mismatch request=%s expected=%s got=%s",
                request_uuid,
                user_uuid,
                req.user_id,
            )
            return {"status": "forbidden"}
        req.status = "running"
        db.flush()

        try:
            # B7 review P1-9 — rebuild the snapshot in the worker so the
            # broker payload stays tiny (just two UUIDs).
            report_snapshot = asyncio.run(_build_snapshot_async(user_uuid, req.period))

            params = {
                "locale": req.locale,
                "include_sensitive": req.include_sensitive,
                "sections": req.sections,
                "audit_id": str(req.id),
            }
            html = _render_html(report_snapshot, params)
            with time_pdf_render():
                payload = _render_pdf_bytes(html)
            digest = sha256_hex(payload)

            now = datetime.datetime.now(datetime.timezone.utc)
            key = f"reports/{user_uuid}/{request_uuid}.pdf"
            bucket = settings.storage_bucket_docs
            upload_file(bucket=bucket, key=key, file_bytes=payload, content_type="application/pdf")

            req.status = "completed"
            req.completed_at = now
            req.bucket = bucket
            req.key = key
            req.bytes = len(payload)
            req.sha256 = digest
            req.expires_at = now + EXPORT_TTL
            db.flush()

            notif = Notification(
                user_id=user_uuid,
                title="Your PDF report is ready",
                body=(
                    f"Your {req.period} health report ({len(payload) // 1024} KB) is ready. "
                    "The download link expires in 24 hours."
                ),
                kind=NotificationKindEnum.REPORT_PDF.value,
                reference_id=request_uuid,
                link=f"/dashboard/reports?pdf={request_uuid}",
            )
            db.add(notif)
            db.flush()

            return {"status": "completed", "bytes": len(payload), "request_id": str(request_uuid)}
        except ImportError as exc:
            # WeasyPrint or its system deps (Cairo/Pango) are unavailable.
            # Mark the row clearly so operators don't waste time chasing the
            # generic "render failed" path. Don't retry — this isn't transient.
            logger.exception("WeasyPrint unavailable on this worker: %s", exc)
            req.status = "failed"
            req.error = (
                "PDF rendering library is not installed on this worker. "
                "Install WeasyPrint and its system dependencies (Cairo, Pango)."
            )
            db.flush()
            return {"status": "failed", "error": "weasyprint_unavailable"}
        except Exception as exc:  # noqa: BLE001
            logger.exception("Report PDF render failed for %s", request_uuid)
            req.status = "failed"
            req.error = str(exc)[:500]
            db.flush()
            try:
                self.retry(exc=exc, countdown=60)
            except self.MaxRetriesExceededError:
                pass
            return {"status": "failed", "error": str(exc)}

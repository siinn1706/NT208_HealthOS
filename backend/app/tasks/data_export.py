"""B7 P8 — Celery task that builds a user's data export tarball.

Streams every owned table into JSON Lines files inside an in-memory tarball,
uploads to MinIO, then inserts an in-app notification ("Export ready").

Domains exported:
  * users.profile       (basic user record + UserProfile)
  * meals               (one JSONL line per meal)
  * health_metrics      (one line per metric)
  * appointments        (with prescription summary + asset metadata)
  * reminders           (schedule + occurrence sample)
  * notifications       (the user's own list)
  * audit_logs          (events linked to the user)

Sensitive bits like password hashes are deliberately omitted.
"""
from __future__ import annotations

import datetime
import gzip
import io
import json
import logging
import tarfile
import uuid
from typing import Iterable

from sqlalchemy import select

from app.adapters.database import get_sync_db_context
from app.adapters.storage import sha256_hex, upload_file
from app.core.config import settings
from app.models.audit import AuditLog
from app.models.core import (
    Appointment,
    DataExportRequest,
    DataExportStatusEnum,
    HealthMetric,
    Meal,
    MedicationPlan,
    Notification,
    NotificationKindEnum,
    Reminder,
    User,
    UserProfile,
)
from app.tasks import celery_app

logger = logging.getLogger(__name__)

EXPORT_TTL = datetime.timedelta(hours=24)


def _serialize(value):
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


def _row_to_dict(row, columns: Iterable[str]) -> dict:
    return {col: _serialize(getattr(row, col, None)) for col in columns}


def _jsonl(rows: Iterable[dict]) -> bytes:
    buf = io.BytesIO()
    for row in rows:
        buf.write((json.dumps(row, ensure_ascii=False) + "\n").encode("utf-8"))
    return buf.getvalue()


def _add_to_tar(tar: tarfile.TarFile, name: str, payload: bytes) -> None:
    info = tarfile.TarInfo(name=name)
    info.size = len(payload)
    info.mtime = int(datetime.datetime.now().timestamp())
    tar.addfile(info, io.BytesIO(payload))


@celery_app.task(name="app.tasks.data_export.build_user_export", bind=True, max_retries=2)
def build_user_export(self, user_id: str, request_id: str) -> dict:
    """Build the export tarball, upload it, and emit an in-app notification."""
    user_uuid = uuid.UUID(user_id)
    request_uuid = uuid.UUID(request_id)

    with get_sync_db_context() as db:
        req = db.get(DataExportRequest, request_uuid)
        if req is None:
            return {"status": "missing"}
        req.status = DataExportStatusEnum.RUNNING.value
        db.flush()

        try:
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
                user = db.get(User, user_uuid)
                if user is None:
                    raise RuntimeError("User row vanished mid-export")
                profile = db.execute(
                    select(UserProfile).where(UserProfile.user_id == user_uuid)
                ).scalar_one_or_none()

                _add_to_tar(
                    tar,
                    "user.json",
                    json.dumps(
                        {
                            "user": _row_to_dict(
                                user,
                                ["id", "email", "username", "display_name", "onboarding_status",
                                 "email_verified_at", "created_at", "updated_at"],
                            ),
                            "profile": _row_to_dict(
                                profile,
                                ["full_name", "date_of_birth", "gender", "blood_type",
                                 "height_cm", "weight_kg", "phone", "address", "avatar_url",
                                 "emergency_contacts", "medical_info"],
                            ) if profile else None,
                        },
                        ensure_ascii=False,
                        indent=2,
                    ).encode("utf-8"),
                )

                meals = db.execute(select(Meal).where(Meal.user_id == user_uuid)).scalars().all()
                _add_to_tar(
                    tar,
                    "meals.jsonl",
                    _jsonl(
                        _row_to_dict(
                            m,
                            [
                                "id", "name", "image_url", "status", "nutrition_result",
                                "logged_at", "created_at", "updated_at",
                            ],
                        )
                        for m in meals
                    ),
                )

                metrics = db.execute(
                    select(HealthMetric).where(HealthMetric.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "health_metrics.jsonl",
                    _jsonl(
                        _row_to_dict(
                            m,
                            ["id", "metric_type", "value", "unit", "recorded_at", "source", "created_at"],
                        )
                        for m in metrics
                    ),
                )

                appts = db.execute(
                    select(Appointment).where(Appointment.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "appointments.jsonl",
                    _jsonl(
                        _row_to_dict(
                            a,
                            [
                                "id", "appointment_date", "doctor_name", "specialty",
                                "clinic", "diagnosis", "status", "notes", "prescription",
                                "created_at", "updated_at",
                            ],
                        )
                        for a in appts
                    ),
                )

                reminders = db.execute(
                    select(Reminder).where(Reminder.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "reminders.jsonl",
                    _jsonl(
                        _row_to_dict(
                            r,
                            [
                                "id", "type", "title", "remind_time", "repeat", "note",
                                "tzid", "weekday_mask", "day_of_month",
                                "start_date", "end_date", "is_active",
                                "medication_plan_id",
                                "created_at",
                            ],
                        )
                        for r in reminders
                    ),
                )

                medication_plans = db.execute(
                    select(MedicationPlan).where(MedicationPlan.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "medication_plans.jsonl",
                    _jsonl(
                        _row_to_dict(
                            p,
                            [
                                "id", "appointment_id", "name", "generic_name",
                                "strength", "form", "instructions", "prescriber",
                                "clinic", "start_date", "end_date", "status", "tzid",
                                "refill_supply_units", "refill_cadence_days",
                                "last_refill_at", "next_refill_estimated_at",
                                "review_due_at", "notes",
                                "created_at", "updated_at",
                            ],
                        )
                        for p in medication_plans
                    ),
                )

                notifs = db.execute(
                    select(Notification).where(Notification.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "notifications.jsonl",
                    _jsonl(
                        _row_to_dict(n, ["id", "title", "body", "kind", "is_read", "created_at"])
                        for n in notifs
                    ),
                )

                audit_rows = db.execute(
                    select(AuditLog).where(AuditLog.user_id == user_uuid)
                ).scalars().all()
                _add_to_tar(
                    tar,
                    "audit_logs.jsonl",
                    _jsonl(
                        {
                            "id": str(a.id),
                            "event_type": a.event_type.value if a.event_type else None,
                            "ip_address": a.ip_address,
                            "user_agent": a.user_agent,
                            "details": a.details,
                            "created_at": _serialize(a.created_at),
                        }
                        for a in audit_rows
                    ),
                )

                # README inside the archive — explains the layout to the user.
                _add_to_tar(
                    tar,
                    "README.txt",
                    (
                        "HealthOS data export\n"
                        f"Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}\n"
                        "\nThis archive contains every record HealthOS holds about you.\n"
                        "Each `.jsonl` file is one record per line (JSON Lines format).\n"
                        "user.json is your profile root.\n"
                        "medication_plans.jsonl lists each tracked medication. The dose\n"
                        "schedule for each plan lives in reminders.jsonl, joined by the\n"
                        "`medication_plan_id` column.\n"
                        "\nIf you no longer need this archive, delete it locally — the\n"
                        "download link will also expire automatically after 24h.\n"
                    ).encode("utf-8"),
                )

            payload = buffer.getvalue()
            digest = sha256_hex(payload)
            key = f"exports/{user_uuid}/{request_uuid}.tar.gz"
            bucket = settings.storage_bucket_docs
            upload_file(
                bucket=bucket,
                key=key,
                file_bytes=payload,
                content_type="application/gzip",
            )

            req.status = DataExportStatusEnum.COMPLETED.value
            req.completed_at = datetime.datetime.now(datetime.timezone.utc)
            req.bucket = bucket
            req.key = key
            req.bytes = len(payload)
            req.sha256 = digest
            req.expires_at = req.completed_at + EXPORT_TTL
            db.flush()

            # Emit an in-app notification — the user clicks it to download.
            notif = Notification(
                user_id=user_uuid,
                title="Your data export is ready",
                body=(
                    f"Your archive ({len(payload) // 1024} KB) is available for the next 24 hours."
                ),
                kind=NotificationKindEnum.DATA_EXPORT.value,
                reference_id=request_uuid,
                link=f"/dashboard/settings?export={request_uuid}",
            )
            db.add(notif)
            db.flush()
            return {"status": "completed", "bytes": len(payload), "request_id": str(request_uuid)}
        except Exception as exc:  # noqa: BLE001
            logger.exception("Data export %s failed", request_uuid)
            req.status = DataExportStatusEnum.FAILED.value
            req.error = str(exc)[:500]
            db.flush()
            try:
                self.retry(exc=exc, countdown=60)
            except self.MaxRetriesExceededError:
                pass
            return {"status": "failed", "error": str(exc)}

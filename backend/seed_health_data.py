"""
Deterministic local demo-data seeder for HealthOS web testing.

Examples:
    python seed_health_data.py --dry-run
    python seed_health_data.py --email admin@healthos.local --days 30 --reset
    python seed_health_data.py --scenario risk --only vitals,meals,notifications

This script only targets an existing user. It does not create accounts, update
profile fields, seed chat data, or write real personal information.
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import math
import os
import random
import sys
import uuid
from collections import Counter
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlparse

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.core import (
    Appointment,
    AppointmentStatusEnum,
    ConnectedDevice,
    DeviceSyncState,
    HealthMetric,
    Meal,
    MealStatusEnum,
    MedicationPlan,
    MetricTypeEnum,
    Notification,
    NotificationKindEnum,
    Reminder,
    ReminderOccurrence,
    ReminderOccurrenceStatusEnum,
    ReminderRepeatEnum,
    ReminderTypeEnum,
    ReportExportRequest,
    User,
    WearableProviderEnum,
    WearableSourceEnum,
)
from app.models.health_goal import HealthGoal

# Import side-effect model modules so SQLAlchemy relationship resolution works.
import app.models.audit  # noqa: F401
import app.models.emergency  # noqa: F401
import app.models.visit_briefs  # noqa: F401


DATABASE_URL = settings.database_url
DEFAULT_EMAIL = "admin@healthos.local"
SEED_TAG = "healthos.seed_health_data.v2"
SEED_SOURCE_APP = "seed_health_data.py"
SEED_NAMESPACE = uuid.UUID("a7c265fb-bd58-53ad-92e1-9d7c22f63b66")
SCENARIOS = ("baseline", "active", "risk", "med-heavy")
ALL_DOMAINS = (
    "vitals",
    "meals",
    "appointments",
    "medications",
    "prescriptions",
    "reminders",
    "notifications",
    "goals",
    "reports",
    "devices",
)
DEFAULT_TZID = "Asia/Ho_Chi_Minh"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


BREAKFAST_POOL = [
    {"name": "Phở bò tái nạm", "calories": 450, "protein_g": 28, "carbs_g": 55, "fat_g": 12},
    {"name": "Bánh mì trứng ốp la", "calories": 310, "protein_g": 14, "carbs_g": 40, "fat_g": 11},
    {"name": "Cháo gà", "calories": 280, "protein_g": 18, "carbs_g": 38, "fat_g": 6},
    {"name": "Bún bò Huế", "calories": 520, "protein_g": 32, "carbs_g": 60, "fat_g": 14},
    {"name": "Xôi gà", "calories": 420, "protein_g": 22, "carbs_g": 58, "fat_g": 10},
    {"name": "Bánh cuốn nhân thịt", "calories": 350, "protein_g": 16, "carbs_g": 48, "fat_g": 9},
    {"name": "Hủ tiếu Nam Vang", "calories": 390, "protein_g": 20, "carbs_g": 52, "fat_g": 10},
]
LUNCH_POOL = [
    {"name": "Cơm sườn nướng", "calories": 680, "protein_g": 38, "carbs_g": 75, "fat_g": 20},
    {"name": "Cơm tấm bì chả", "calories": 720, "protein_g": 40, "carbs_g": 78, "fat_g": 22},
    {"name": "Cơm gà chiên giòn", "calories": 650, "protein_g": 36, "carbs_g": 70, "fat_g": 18},
    {"name": "Bún thịt nướng chả giò", "calories": 560, "protein_g": 30, "carbs_g": 65, "fat_g": 15},
    {"name": "Mì xào hải sản", "calories": 590, "protein_g": 28, "carbs_g": 68, "fat_g": 16},
    {"name": "Cơm chiên dương châu", "calories": 630, "protein_g": 22, "carbs_g": 80, "fat_g": 18},
    {"name": "Bánh mì thịt nguội", "calories": 420, "protein_g": 22, "carbs_g": 50, "fat_g": 14},
]
DINNER_POOL = [
    {"name": "Cơm canh chua cá lóc", "calories": 580, "protein_g": 32, "carbs_g": 68, "fat_g": 16},
    {"name": "Lẩu gà lá giang", "calories": 500, "protein_g": 38, "carbs_g": 42, "fat_g": 18},
    {"name": "Cơm cá kho tộ", "calories": 540, "protein_g": 35, "carbs_g": 62, "fat_g": 14},
    {"name": "Salad ức gà nướng", "calories": 480, "protein_g": 42, "carbs_g": 30, "fat_g": 16},
    {"name": "Bún riêu cua", "calories": 430, "protein_g": 24, "carbs_g": 55, "fat_g": 12},
    {"name": "Miến gà", "calories": 460, "protein_g": 22, "carbs_g": 58, "fat_g": 14},
    {"name": "Cơm rang trứng", "calories": 520, "protein_g": 18, "carbs_g": 70, "fat_g": 15},
]
SNACK_POOL = [
    {"name": "Sữa chua trái cây", "calories": 180, "protein_g": 6, "carbs_g": 32, "fat_g": 3},
    {"name": "Bánh quy cà phê", "calories": 220, "protein_g": 4, "carbs_g": 35, "fat_g": 8},
    {"name": "Sinh tố xoài chanh dây", "calories": 150, "protein_g": 2, "carbs_g": 36, "fat_g": 1},
    {"name": "Sinh tố bơ", "calories": 260, "protein_g": 4, "carbs_g": 22, "fat_g": 16},
]


@dataclass(frozen=True)
class SeedOptions:
    email: str
    days: int
    seed: int
    scenario: str
    only: tuple[str, ...]
    reset: bool
    append: bool
    dry_run: bool


def parse_args(argv: list[str] | None = None) -> SeedOptions:
    parser = argparse.ArgumentParser(description="Seed deterministic local HealthOS demo data.")
    parser.add_argument("legacy_email", nargs="?", help=argparse.SUPPRESS)
    parser.add_argument("--email", default=None, help="Existing user email to seed.")
    parser.add_argument("--days", type=int, default=30, help="Calendar days including today (1..90).")
    parser.add_argument("--seed", type=int, default=42, help="Deterministic random seed.")
    parser.add_argument("--scenario", choices=SCENARIOS, default="baseline")
    parser.add_argument("--only", default="all", help="Comma-separated domains, or all.")
    parser.add_argument("--reset", action="store_true", help="Delete only generated fake rows first.")
    parser.add_argument("--append", action="store_true", help="Skip existing generated rows; default behavior.")
    parser.add_argument("--dry-run", action="store_true", help="Print counts and rollback all writes.")
    args = parser.parse_args(argv)

    if args.days < 1 or args.days > 90:
        parser.error("--days must be between 1 and 90")

    raw_domains = [item.strip() for item in args.only.split(",") if item.strip()]
    if raw_domains == ["all"] or not raw_domains:
        domains = ALL_DOMAINS
    else:
        invalid = [item for item in raw_domains if item not in ALL_DOMAINS]
        if invalid:
            parser.error(f"unknown --only domain(s): {', '.join(invalid)}")
        domains = tuple(dict.fromkeys(raw_domains))

    return SeedOptions(
        email=args.email or args.legacy_email or DEFAULT_EMAIL,
        days=args.days,
        seed=args.seed,
        scenario=args.scenario,
        only=domains,
        reset=args.reset,
        append=True,
        dry_run=args.dry_run,
    )


def seed_key(domain: str, scenario: str, seed: int, part: str) -> str:
    return f"{SEED_TAG}:{domain}:{scenario}:{seed}:{part}"


def stable_uuid(user_id: uuid.UUID, key: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"{user_id}:{key}")


def rng_for(options: SeedOptions, domain: str, part: str) -> random.Random:
    return random.Random(f"{options.seed}:{options.scenario}:{domain}:{part}")


def utc_today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def at_utc(day: dt.date, hour: int, minute: int = 0) -> dt.datetime:
    return dt.datetime.combine(day, dt.time(hour, minute), tzinfo=dt.timezone.utc)


def date_window(days: int) -> list[dt.date]:
    today = utc_today()
    start = today - dt.timedelta(days=days - 1)
    return [start + dt.timedelta(days=i) for i in range(days)]


def is_reset_database_allowed(database_url: str) -> bool:
    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()
    name = (parsed.path or "").strip("/").lower()
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    return any(token in name for token in ("dev", "local", "test"))


def describe_database(database_url: str) -> str:
    parsed = urlparse(database_url)
    return f"host={parsed.hostname or 'unknown'} db={(parsed.path or '/').strip('/') or 'unknown'}"


def guard_writes_allowed(options: SeedOptions, database_url: str = DATABASE_URL) -> None:
    if options.dry_run:
        return
    envs = {
        (os.environ.get("APP_ENV") or "").lower(),
        (os.environ.get("NODE_ENV") or "").lower(),
    }
    if "production" in envs:
        raise RuntimeError("Refusing to seed data while APP_ENV/NODE_ENV is production.")
    if options.reset and not is_reset_database_allowed(database_url):
        raise RuntimeError(
            "Refusing --reset against a non-local/non-dev database "
            f"({describe_database(database_url)})."
        )


async def count_query(db: AsyncSession, stmt) -> int:
    return int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one() or 0)


async def add_if_missing(db: AsyncSession, obj, counters: Counter, domain: str) -> None:
    existing = await db.get(type(obj), obj.id)
    if existing is None:
        db.add(obj)
        counters[f"{domain}.inserted"] += 1
    else:
        counters[f"{domain}.skipped"] += 1


def sinusoidal(base: float, amplitude: float, index: int, period: int = 7) -> float:
    return base + amplitude * math.sin(2 * math.pi * index / period)


def scenario_shift(options: SeedOptions, metric: str) -> float:
    if options.scenario == "active" and metric == "steps":
        return 2500
    if options.scenario == "risk" and metric in {"hr", "sys", "dia"}:
        return {"hr": 10, "sys": 14, "dia": 8}[metric]
    if options.scenario == "risk" and metric == "steps":
        return -2500
    if options.scenario == "med-heavy" and metric == "sleep":
        return -35
    return 0


def metric_value(options: SeedOptions, day: dt.date, idx: int, metric: str) -> float:
    rng = rng_for(options, "vitals", f"{day.isoformat()}:{metric}")
    if metric == "hr_am":
        value = sinusoidal(70 + scenario_shift(options, "hr"), 4, idx, 7) + rng.uniform(-3, 3)
        if options.scenario == "risk" and idx in {2, 8, 17}:
            value = rng.uniform(104, 118)
        return round(value, 1)
    if metric == "hr_pm":
        return round(min(max(metric_value(options, day, idx, "hr_am") + rng.uniform(-2, 7), 58), 125), 1)
    if metric == "sys":
        value = sinusoidal(118 + scenario_shift(options, "sys"), 6, idx, 10) + rng.uniform(-4, 4)
        if options.scenario == "risk" and idx in {4, 11, 22}:
            value = rng.uniform(145, 158)
        return round(value, 1)
    if metric == "dia":
        value = sinusoidal(76 + scenario_shift(options, "dia"), 4, idx, 10) + rng.uniform(-3, 3)
        if options.scenario == "risk" and idx in {4, 11, 22}:
            value = rng.uniform(92, 99)
        return round(value, 1)
    if metric == "steps":
        weekday = day.weekday()
        base = (8500 if weekday < 5 else 5500) + scenario_shift(options, "steps")
        value = sinusoidal(base, 1700, idx, 5) + rng.uniform(-900, 900)
        if options.scenario == "active" and idx % 6 == 0:
            value += 2500
        if options.scenario == "risk" and idx % 5 == 0:
            value = rng.uniform(1800, 3900)
        return round(max(value, 500))
    if metric == "sleep":
        value = sinusoidal(435 + scenario_shift(options, "sleep"), 45, idx, 7) + rng.uniform(-25, 25)
        if idx % 9 == 0 or options.scenario == "med-heavy" and idx % 6 == 0:
            value = rng.uniform(250, 340)
        return round(max(value, 60))
    if metric == "weight":
        start_weight = 69.2 if options.scenario == "risk" else 68.5
        return round(start_weight - (idx * 0.025) + rng.uniform(-0.25, 0.25), 1)
    if metric == "water_am":
        # Morning water intake 400-700 ml
        return round(rng.uniform(400, 700))
    if metric == "water_pm":
        # Afternoon/evening water intake 500-900 ml
        return round(rng.uniform(500, 900))
    if metric == "water_eve":
        # Evening top-up 200-500 ml
        return round(rng.uniform(200, 500))
    raise ValueError(metric)


async def reset_generated_data(db: AsyncSession, user_id: uuid.UUID, domains: Iterable[str]) -> Counter:
    counters: Counter = Counter()
    selected = set(domains)
    if "reports" in selected:
        res = await db.execute(
            delete(ReportExportRequest).where(
                ReportExportRequest.user_id == user_id,
                or_(
                    ReportExportRequest.error.like(f"%{SEED_TAG}%"),
                    ReportExportRequest.id.in_(
                        [
                            stable_uuid(user_id, seed_key("reports", scenario, seed, part))
                            for scenario in SCENARIOS
                            for seed in (42,)
                            for part in ("pending", "failed")
                        ]
                    ),
                ),
            )
        )
        counters["reports.reset"] += int(res.rowcount or 0)
    if "notifications" in selected:
        res = await db.execute(
            delete(Notification).where(Notification.user_id == user_id, Notification.body.like(f"%{SEED_TAG}%"))
        )
        counters["notifications.reset"] += int(res.rowcount or 0)
    if "medications" in selected:
        plan_ids = select(MedicationPlan.id).where(
            MedicationPlan.user_id == user_id,
            MedicationPlan.dedupe_key.like(f"{SEED_TAG}:%"),
        )
        rem_ids = select(Reminder.id).where(Reminder.medication_plan_id.in_(plan_ids))
        await db.execute(delete(ReminderOccurrence).where(ReminderOccurrence.reminder_id.in_(rem_ids)))
        await db.execute(delete(Reminder).where(Reminder.id.in_(rem_ids)))
        res = await db.execute(delete(MedicationPlan).where(MedicationPlan.id.in_(plan_ids)))
        counters["medications.reset"] += int(res.rowcount or 0)
    if "reminders" in selected:
        rem_ids = select(Reminder.id).where(
            Reminder.user_id == user_id,
            Reminder.medication_plan_id.is_(None),
            Reminder.note.like(f"%{SEED_TAG}%"),
        )
        await db.execute(delete(ReminderOccurrence).where(ReminderOccurrence.reminder_id.in_(rem_ids)))
        res = await db.execute(delete(Reminder).where(Reminder.id.in_(rem_ids)))
        counters["reminders.reset"] += int(res.rowcount or 0)
    if "appointments" in selected or "prescriptions" in selected:
        res = await db.execute(
            delete(Appointment).where(
                Appointment.user_id == user_id,
                or_(
                    Appointment.notes.like(f"%{SEED_TAG}%"),
                    Appointment.prescription.contains({"_seed_tag": SEED_TAG}),
                ),
            )
        )
        counters["appointments.reset"] += int(res.rowcount or 0)
    if "meals" in selected:
        res = await db.execute(
            delete(Meal).where(Meal.user_id == user_id, Meal.nutrition_result.contains({"_seed_tag": SEED_TAG}))
        )
        counters["meals.reset"] += int(res.rowcount or 0)
    if "vitals" in selected:
        res = await db.execute(
            delete(HealthMetric).where(HealthMetric.user_id == user_id, HealthMetric.external_id.like(f"{SEED_TAG}:%"))
        )
        counters["vitals.reset"] += int(res.rowcount or 0)
    if "devices" in selected:
        device_ids = select(ConnectedDevice.id).where(
            ConnectedDevice.user_id == user_id,
            ConnectedDevice.external_account_id.like(f"{SEED_TAG}:%"),
        )
        await db.execute(delete(DeviceSyncState).where(DeviceSyncState.device_id.in_(device_ids)))
        res = await db.execute(delete(ConnectedDevice).where(ConnectedDevice.id.in_(device_ids)))
        counters["devices.reset"] += int(res.rowcount or 0)
    return counters


async def report_legacy_rows(db: AsyncSession, user_id: uuid.UUID) -> Counter:
    counters: Counter = Counter()
    old_metric_stmt = select(HealthMetric).where(
        HealthMetric.user_id == user_id,
        HealthMetric.external_id.is_(None),
        HealthMetric.source_app.is_(None),
    )
    old_meal_stmt = select(Meal).where(
        Meal.user_id == user_id,
        or_(
            Meal.nutrition_result.is_(None),
            ~Meal.nutrition_result.contains({"_seed_tag": SEED_TAG}),
        ),
    )
    counters["legacy.metrics_not_reset"] = await count_query(db, old_metric_stmt)
    counters["legacy.meals_not_reset"] = await count_query(db, old_meal_stmt)
    return counters


async def seed_devices(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> uuid.UUID:
    key = seed_key("devices", options.scenario, options.seed, "health-connect-demo")
    device_id = stable_uuid(user.id, key)
    now = dt.datetime.now(dt.timezone.utc)
    scopes = ["Steps", "HeartRate", "SleepSession", "Weight", "BloodPressure", "ExerciseSession"]
    device = ConnectedDevice(
        id=device_id,
        user_id=user.id,
        provider=WearableProviderEnum.HEALTH_CONNECT,
        external_account_id=key,
        device_label=f"Thiết bị HealthOS ({options.scenario})",
        scopes=scopes,
        last_sync_status="partial" if options.scenario == "risk" else "ok",
        last_sync_error="LOW_ACTIVITY_SAMPLE" if options.scenario == "risk" else None,
        last_sync_count=options.days * 7,
        connected_at=now - dt.timedelta(days=options.days),
        last_attempted_at=now - dt.timedelta(minutes=20),
        last_synced_at=now - dt.timedelta(minutes=20),
    )
    await add_if_missing(db, device, counters, "devices")
    for record_type in scopes:
        state_key = seed_key("devices", options.scenario, options.seed, f"sync:{record_type}")
        state = DeviceSyncState(
            id=stable_uuid(user.id, state_key),
            device_id=device_id,
            record_type=record_type,
            changes_token=f"{SEED_TAG}:{record_type}:token",
            last_synced_at=now - dt.timedelta(minutes=20),
            last_attempted_at=now - dt.timedelta(minutes=20),
            consecutive_failures=1 if options.scenario == "risk" and record_type == "ExerciseSession" else 0,
        )
        await add_if_missing(db, state, counters, "devices")
    return device_id


async def seed_vitals(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> None:
    rows: list[tuple[MetricTypeEnum, float, str, dt.datetime, str]] = []
    for idx, day in enumerate(date_window(options.days)):
        rows.extend(
            [
                (MetricTypeEnum.HEART_RATE, metric_value(options, day, idx, "hr_am"), "bpm", at_utc(day, 7, 30), "hr-am"),
                (MetricTypeEnum.HEART_RATE, metric_value(options, day, idx, "hr_pm"), "bpm", at_utc(day, 19), "hr-pm"),
                (
                    MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
                    metric_value(options, day, idx, "sys"),
                    "mmHg",
                    at_utc(day, 7, 35),
                    "bp-sys",
                ),
                (
                    MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
                    metric_value(options, day, idx, "dia"),
                    "mmHg",
                    at_utc(day, 7, 35),
                    "bp-dia",
                ),
                (MetricTypeEnum.STEPS, metric_value(options, day, idx, "steps"), "steps", at_utc(day, 22), "steps"),
                (
                    MetricTypeEnum.SLEEP_MINUTES,
                    metric_value(options, day, idx, "sleep"),
                    "min",
                    at_utc(day, 6, 30),
                    "sleep",
                ),
                (MetricTypeEnum.WEIGHT_KG, metric_value(options, day, idx, "weight"), "kg", at_utc(day, 7), "weight"),
                (MetricTypeEnum.WATER_ML, metric_value(options, day, idx, "water_am"), "ml", at_utc(day, 8), "water-am"),
                (MetricTypeEnum.WATER_ML, metric_value(options, day, idx, "water_pm"), "ml", at_utc(day, 13), "water-pm"),
                (MetricTypeEnum.WATER_ML, metric_value(options, day, idx, "water_eve"), "ml", at_utc(day, 20), "water-eve"),
            ]
        )
    for metric_type, value, unit, recorded_at, label in rows:
        key = seed_key("vitals", options.scenario, options.seed, f"{recorded_at.isoformat()}:{label}")
        metric = HealthMetric(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            recorded_at=recorded_at,
            source=WearableSourceEnum.MANUAL,
            external_id=key,
            source_app=SEED_SOURCE_APP,
            recording_method="manual",
            is_deleted=False,
        )
        await add_if_missing(db, metric, counters, "vitals")


async def seed_meals(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> None:
    meals_by_slot = [
        ("breakfast", BREAKFAST_POOL, 7, 0),
        ("lunch", LUNCH_POOL, 12, 0),
        ("dinner", DINNER_POOL, 19, 0),
    ]
    for idx, day in enumerate(date_window(options.days)):
        pool_idx = idx % 7
        macro_factor = 1.0
        if options.scenario == "active":
            macro_factor = 1.08
        elif options.scenario == "risk" and idx % 5 == 0:
            macro_factor = 1.22
        for slot, pool, hour, minute in meals_by_slot:
            rng = rng_for(options, "meals", f"{day.isoformat()}:{slot}")
            tpl = pool[pool_idx % len(pool)]
            factor = macro_factor * rng.uniform(0.9, 1.1)
            key = seed_key("meals", options.scenario, options.seed, f"{day.isoformat()}:{slot}")
            meal = Meal(
                id=stable_uuid(user.id, key),
                user_id=user.id,
                name=tpl["name"],
                logged_at=at_utc(day, hour, minute),
                nutrition_result={
                    "calories": round(tpl["calories"] * factor),
                    "protein_g": round(tpl["protein_g"] * factor, 1),
                    "carbs_g": round(tpl["carbs_g"] * factor, 1),
                    "fat_g": round(tpl["fat_g"] * factor, 1),
                    "_seed_tag": SEED_TAG,
                    "_seed_key": key,
                    "scenario": options.scenario,
                },
                status=MealStatusEnum.ANALYZED,
            )
            await add_if_missing(db, meal, counters, "meals")
        if rng_for(options, "meals", f"{day.isoformat()}:snack").random() < 0.65:
            snack = SNACK_POOL[pool_idx % len(SNACK_POOL)]
            key = seed_key("meals", options.scenario, options.seed, f"{day.isoformat()}:snack")
            meal = Meal(
                id=stable_uuid(user.id, key),
                user_id=user.id,
                name=snack["name"],
                logged_at=at_utc(day, 15, 30),
                nutrition_result={**snack, "_seed_tag": SEED_TAG, "_seed_key": key, "scenario": options.scenario},
                status=MealStatusEnum.ANALYZED,
            )
            await add_if_missing(db, meal, counters, "meals")


def appointment_templates(options: SeedOptions) -> list[dict]:
    base = [
        {"offset": -24, "doctor": "BS. Nguyễn Văn An", "specialty": "Đa khoa", "reason": "Khám tổng quát định kỳ"},
        {"offset": -10, "doctor": "BS. Trần Thị Mai", "specialty": "Tim mạch", "reason": "Tái khám huyết áp"},
        {"offset": 4, "doctor": "BS. Lê Hoàng Nam", "specialty": "Dinh dưỡng", "reason": "Tư vấn chế độ ăn"},
        {"offset": 14, "doctor": "BS. Phạm Minh Tuấn", "specialty": "Nội khoa", "reason": "Đánh giá lại đơn thuốc"},
    ]
    if options.scenario in {"risk", "med-heavy"}:
        base.append({"offset": 28, "doctor": "BS. Võ Thanh Hà", "specialty": "Nội tiết", "reason": "Kiểm tra rối loạn chuyển hóa"})
    return base


def prescription_payload(options: SeedOptions, idx: int, appt: dict, issued_at: dt.datetime) -> dict:
    meds = [
        {"name": "Lisinopril", "dosage": "10 mg viên nén", "frequency": "1 lần/ngày", "duration": "30 ngày", "notes": "Uống buổi sáng, theo dõi huyết áp."},
        {"name": "Vitamin D3", "dosage": "1000 IU viên nang", "frequency": "1 lần/ngày", "duration": "60 ngày", "notes": "Bổ sung vitamin D, uống sau ăn."},
    ]
    if options.scenario == "med-heavy" or idx == 1:
        meds.append({"name": "Metformin", "dosage": "500 mg viên nén", "frequency": "2 lần/ngày", "duration": "90 ngày", "notes": "Uống sau ăn sáng và tối."})
    return {
        "_seed_tag": SEED_TAG,
        "id": seed_key("prescriptions", options.scenario, options.seed, f"rx:{idx}"),
        "issued_at": issued_at.isoformat(),
        "doctor": appt["doctor"],
        "clinic": "Phòng khám Đa khoa Sài Gòn",
        "diagnosis": appt["reason"],
        "medicines": meds,
        "notes": "Đơn thuốc kê theo kết quả khám.",
    }


async def seed_appointments(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> list[uuid.UUID]:
    ids: list[uuid.UUID] = []
    today = utc_today()
    for idx, tpl in enumerate(appointment_templates(options)):
        day = today + dt.timedelta(days=tpl["offset"])
        appt_at = at_utc(day, 9 + idx, 30)
        key = seed_key("appointments", options.scenario, options.seed, f"appointment:{idx}")
        status = AppointmentStatusEnum.COMPLETED if tpl["offset"] < 0 else AppointmentStatusEnum.UPCOMING
        appointment = Appointment(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            appointment_date=appt_at,
            doctor_name=tpl["doctor"],
            specialty=tpl["specialty"],
            clinic="Phòng khám Đa khoa Sài Gòn",
            diagnosis=tpl["reason"],
            status=status,
            notes=f"{SEED_TAG} Lịch khám {tpl['specialty']} — {tpl['reason']}.",
            prescription=prescription_payload(options, idx, tpl, appt_at) if idx in {1, 3} or options.scenario == "med-heavy" else None,
        )
        await add_if_missing(db, appointment, counters, "appointments")
        ids.append(appointment.id)
    return ids


def medication_templates(options: SeedOptions) -> list[dict]:
    templates = [
        {"name": "Lisinopril", "strength": "10 mg", "times": ["08:00"], "supply": 16, "status": "active"},
        {"name": "Vitamin D3", "strength": "1000 IU", "times": ["08:00"], "supply": 45, "status": "active"},
        {"name": "Cetirizine (dị ứng)", "strength": "10 mg", "times": ["20:00"], "supply": 0, "status": "completed"},
    ]
    if options.scenario in {"risk", "med-heavy"}:
        templates.append({"name": "Metformin", "strength": "500 mg", "times": ["08:00", "20:00"], "supply": 12, "status": "active"})
    if options.scenario == "med-heavy":
        templates.extend(
            [
                {"name": "Atorvastatin", "strength": "20 mg", "times": ["21:00"], "supply": 7, "status": "paused"},
                {"name": "Amoxicillin", "strength": "500 mg", "times": ["07:00", "15:00", "23:00"], "supply": 0, "status": "cancelled"},
            ]
        )
    return templates


async def seed_occurrences_for_reminder(
    db: AsyncSession,
    user: User,
    options: SeedOptions,
    counters: Counter,
    reminder: Reminder,
    *,
    domain: str,
    active: bool,
) -> None:
    today = utc_today()
    scheduled_days = [today - dt.timedelta(days=i) for i in range(6, 0, -1)] + [today, today + dt.timedelta(days=1)]
    for idx, day in enumerate(scheduled_days):
        scheduled_at = at_utc(day, reminder.time_of_day.hour if reminder.time_of_day else 8, reminder.time_of_day.minute if reminder.time_of_day else 0)
        part = f"occ:{reminder.id}:{scheduled_at.isoformat()}"
        key = seed_key(domain, options.scenario, options.seed, part)
        status = ReminderOccurrenceStatusEnum.PENDING.value
        done_at = skipped_at = snoozed_until = fired_at = None
        if not active:
            status = ReminderOccurrenceStatusEnum.CANCELLED.value
            skipped_at = scheduled_at + dt.timedelta(minutes=10)
        elif day < today:
            if idx % 7 == 1 and options.scenario in {"risk", "med-heavy"}:
                status = ReminderOccurrenceStatusEnum.MISSED.value
                fired_at = scheduled_at + dt.timedelta(minutes=5)
            elif idx % 5 == 2:
                status = ReminderOccurrenceStatusEnum.SKIPPED.value
                skipped_at = scheduled_at + dt.timedelta(minutes=15)
            else:
                status = ReminderOccurrenceStatusEnum.DONE.value
                done_at = scheduled_at + dt.timedelta(minutes=20)
        elif day == today and idx % 2 == 0:
            status = ReminderOccurrenceStatusEnum.DONE.value
            done_at = scheduled_at + dt.timedelta(minutes=12)
        occ = ReminderOccurrence(
            id=stable_uuid(user.id, key),
            reminder_id=reminder.id,
            scheduled_at=scheduled_at,
            status=status,
            done_at=done_at,
            skipped_at=skipped_at,
            snoozed_until=snoozed_until,
            fired_at=fired_at,
            notification_id=None,
        )
        await add_if_missing(db, occ, counters, domain)


async def seed_medications(
    db: AsyncSession,
    user: User,
    options: SeedOptions,
    counters: Counter,
    appointment_ids: list[uuid.UUID],
) -> list[uuid.UUID]:
    plan_ids: list[uuid.UUID] = []
    for idx, tpl in enumerate(medication_templates(options)):
        key = seed_key("medications", options.scenario, options.seed, f"plan:{idx}:{tpl['name']}")
        start = utc_today() - dt.timedelta(days=20 + idx * 4)
        status = tpl["status"]
        active = status == "active"
        end_date = utc_today() - dt.timedelta(days=3) if status in {"completed", "cancelled"} else None
        last_refill = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=22)
        next_refill = dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=max(int(tpl["supply"]), 0)) if active and tpl["supply"] else None
        plan = MedicationPlan(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            appointment_id=appointment_ids[1] if appointment_ids and idx == 0 else None,
            name=tpl["name"],
            generic_name=None,
            strength=tpl["strength"],
            form="tablet",
            instructions="Uống theo chỉ định của bác sĩ.",
            prescriber="BS. Trần Thị Mai",
            clinic="Phòng khám Đa khoa Sài Gòn",
            start_date=start,
            end_date=end_date,
            status=status,
            tzid=DEFAULT_TZID,
            refill_supply_units=tpl["supply"],
            refill_cadence_days=30 if active else None,
            last_refill_at=last_refill if active else None,
            next_refill_estimated_at=next_refill,
            review_due_at=utc_today() + dt.timedelta(days=35) if active else None,
            dedupe_key=key,
            notes=f"{SEED_TAG} Kê theo đơn tái khám.",
        )
        await add_if_missing(db, plan, counters, "medications")
        plan_ids.append(plan.id)
        for time_idx, dose_time in enumerate(tpl["times"]):
            hour, minute = [int(part) for part in dose_time.split(":")]
            rem_key = seed_key("medications", options.scenario, options.seed, f"rem:{idx}:{time_idx}:{dose_time}")
            reminder = Reminder(
                id=stable_uuid(user.id, rem_key),
                user_id=user.id,
                type=ReminderTypeEnum.MEDICINE,
                title=tpl["name"],
                remind_time=dose_time,
                repeat=ReminderRepeatEnum.DAILY,
                note=f"{SEED_TAG} Nhắc uống thuốc đúng giờ.",
                done=not active,
                tzid=DEFAULT_TZID,
                time_of_day=dt.time(hour, minute),
                start_date=start,
                end_date=end_date,
                next_occurrence_at=at_utc(utc_today(), hour, minute) if active else None,
                is_active=active,
                medication_plan_id=plan.id,
            )
            await add_if_missing(db, reminder, counters, "medications")
            await seed_occurrences_for_reminder(db, user, options, counters, reminder, domain="medications", active=active)
    return plan_ids


async def seed_reminders(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> list[uuid.UUID]:
    reminders = [
        {"type": ReminderTypeEnum.EXERCISE, "title": "Đi bộ buổi tối", "time": "18:30", "repeat": ReminderRepeatEnum.DAILY},
        {"type": ReminderTypeEnum.APPOINTMENT, "title": "Chuẩn bị câu hỏi cho bác sĩ", "time": "09:00", "repeat": ReminderRepeatEnum.WEEKLY},
        {"type": ReminderTypeEnum.MEDICINE, "title": "Kiểm tra thuốc còn lại", "time": "20:30", "repeat": ReminderRepeatEnum.WEEKLY},
    ]
    ids: list[uuid.UUID] = []
    for idx, tpl in enumerate(reminders):
        key = seed_key("reminders", options.scenario, options.seed, f"adhoc:{idx}")
        hour, minute = [int(part) for part in tpl["time"].split(":")]
        reminder = Reminder(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            type=tpl["type"],
            title=tpl["title"],
            remind_time=tpl["time"],
            repeat=tpl["repeat"],
            note=f"{SEED_TAG} Nhắc nhở hàng ngày.",
            done=False,
            tzid=DEFAULT_TZID,
            time_of_day=dt.time(hour, minute),
            weekday_mask=0b0010101 if tpl["repeat"] == ReminderRepeatEnum.WEEKLY else None,
            start_date=utc_today() - dt.timedelta(days=14),
            next_occurrence_at=at_utc(utc_today(), hour, minute),
            is_active=True,
        )
        await add_if_missing(db, reminder, counters, "reminders")
        await seed_occurrences_for_reminder(db, user, options, counters, reminder, domain="reminders", active=True)
        ids.append(reminder.id)
    return ids


async def seed_notifications(
    db: AsyncSession,
    user: User,
    options: SeedOptions,
    counters: Counter,
    references: list[uuid.UUID],
) -> None:
    if not references:
        counters["notifications.skipped_no_generated_references"] += 1
        return

    items = [
        ("Báo cáo sức khỏe đã sẵn sàng", "Báo cáo sức khỏe tuần này đã được tạo xong, bạn có thể xem ngay.", NotificationKindEnum.INFO, "/dashboard/reports"),
        ("Nhắc uống thuốc", "Sắp đến giờ uống Lisinopril 10 mg buổi sáng.", NotificationKindEnum.REMINDER, "/dashboard/medications"),
        ("Lịch hẹn sắp tới", "Bạn có lịch khám với BS. Lê Hoàng Nam vào tuần sau.", NotificationKindEnum.APPOINTMENT, "/dashboard/appointments"),
        ("Đồng bộ thiết bị", "Dữ liệu Health Connect đã được đồng bộ thành công.", NotificationKindEnum.INFO, "/dashboard/settings/devices"),
    ]
    now = dt.datetime.now(dt.timezone.utc)
    for idx, (title, body, kind, link) in enumerate(items):
        key = seed_key("notifications", options.scenario, options.seed, f"notification:{idx}")
        notif = Notification(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            title=title,
            body=f"{body} {SEED_TAG}",
            kind=kind.value,
            reference_id=references[idx % len(references)],
            link=link,
            is_read=idx == 0,
            read_at=now - dt.timedelta(hours=2) if idx == 0 else None,
            created_at=now - dt.timedelta(hours=idx + 1),
        )
        await add_if_missing(db, notif, counters, "notifications")


async def seed_goal(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> None:
    # ── BMI / weight goal (user_bmi_goals table) ──
    existing = (await db.execute(select(HealthGoal).where(HealthGoal.user_id == user.id))).scalar_one_or_none()
    if existing is not None:
        counters["goals.skipped_existing_user_goal"] += 1
    else:
        target_weight = 66.5 if options.scenario != "risk" else 67.0
        goal = HealthGoal(
            id=stable_uuid(user.id, seed_key("goals", options.scenario, options.seed, "bmi-goal")),
            user_id=user.id,
            target_weight_kg=target_weight,
            deadline=utc_today() + dt.timedelta(days=90),
        )
        await add_if_missing(db, goal, counters, "goals")

    # ── Daily health goals (user_health_goals table) ──
    from sqlalchemy import text

    daily_goals = [
        ("water_ml", 2000.0),
        ("steps", 10000.0),
        ("calories", 2000.0),
    ]
    now = dt.datetime.now(dt.timezone.utc)
    for metric_type, target_value in daily_goals:
        goal_id = stable_uuid(user.id, seed_key("goals", options.scenario, options.seed, f"daily-{metric_type}"))
        await db.execute(
            text(
                "INSERT INTO user_health_goals (id, user_id, metric_type, target_value, period_type, created_at, updated_at) "
                "VALUES (:id, :uid, :mt, :tv, 'daily', :now, :now) "
                "ON CONFLICT (user_id, metric_type, period_type) DO NOTHING"
            ),
            {"id": goal_id, "uid": user.id, "mt": metric_type, "tv": target_value, "now": now},
        )
        counters["goals.daily_goal_upserted"] += 1


async def seed_reports(db: AsyncSession, user: User, options: SeedOptions, counters: Counter) -> list[uuid.UUID]:
    ids: list[uuid.UUID] = []
    now = dt.datetime.now(dt.timezone.utc)
    for idx, status in enumerate(("pending", "failed")):
        key = seed_key("reports", options.scenario, options.seed, status)
        req = ReportExportRequest(
            id=stable_uuid(user.id, key),
            user_id=user.id,
            status=status,
            period="30d",
            sections=["vitals", "nutrition", "activity", "sleep", "medication"],
            locale="vi",
            include_sensitive=False,
            requested_at=now - dt.timedelta(days=idx + 1),
            completed_at=now - dt.timedelta(days=idx + 1, minutes=-4) if status == "failed" else None,
            expires_at=None,
            bytes=None,
            sha256=None,
            error=f"{SEED_TAG}: Xuất báo cáo PDF thất bại — vui lòng thử lại" if status == "failed" else f"{SEED_TAG}: Đang xử lý xuất báo cáo",
        )
        await add_if_missing(db, req, counters, "reports")
        ids.append(req.id)
    return ids


async def seed(options_or_email: SeedOptions | str | None = None) -> Counter:
    if isinstance(options_or_email, SeedOptions):
        options = options_or_email
    elif isinstance(options_or_email, str):
        options = SeedOptions(options_or_email, 30, 42, "baseline", ALL_DOMAINS, False, True, False)
    else:
        options = parse_args([])

    guard_writes_allowed(options)
    counters: Counter = Counter()
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == options.email))).scalar_one_or_none()
        if user is None:
            print(f"[ERROR] User not found: {options.email}")
            return counters

        print(f"[SEED] Target user: {options.email} (id={user.id})")
        print(f"[SEED] Target database: {describe_database(DATABASE_URL)}")
        print(
            f"[SEED] scenario={options.scenario} days={options.days} seed={options.seed} "
            f"domains={','.join(options.only)} reset={options.reset} dry_run={options.dry_run}"
        )

        counters.update(await report_legacy_rows(db, user.id))
        if options.reset:
            counters.update(await reset_generated_data(db, user.id, options.only))
            await db.flush()

        selected = set(options.only)
        references: list[uuid.UUID] = []
        appointment_ids: list[uuid.UUID] = []
        if "devices" in selected:
            references.append(await seed_devices(db, user, options, counters))
        if "vitals" in selected:
            await seed_vitals(db, user, options, counters)
        if "meals" in selected:
            await seed_meals(db, user, options, counters)
        if "appointments" in selected or "prescriptions" in selected:
            appointment_ids = await seed_appointments(db, user, options, counters)
            references.extend(appointment_ids)
        if "medications" in selected:
            references.extend(await seed_medications(db, user, options, counters, appointment_ids))
        if "reminders" in selected:
            references.extend(await seed_reminders(db, user, options, counters))
        if "goals" in selected:
            await seed_goal(db, user, options, counters)
        if "reports" in selected:
            references.extend(await seed_reports(db, user, options, counters))
        if "notifications" in selected:
            await seed_notifications(db, user, options, counters, references)

        if options.dry_run:
            await db.rollback()
            print("[SEED] Dry-run complete; rolled back all writes.")
        else:
            await db.commit()
            print("[SEED] Commit complete.")

    for key in sorted(counters):
        print(f"[SEED] {key}: {counters[key]}")
    return counters


def main(argv: list[str] | None = None) -> int:
    try:
        options = parse_args(argv)
        asyncio.run(seed(options))
    except RuntimeError as exc:
        print(f"[ERROR] {exc}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())

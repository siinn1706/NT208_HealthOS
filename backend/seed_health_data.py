"""
Seed 30 days of realistic health metrics + daily meals for testing the dashboard.
Usage: python seed_health_data.py [user_email]
Default user: admin@healthos.local
"""
from __future__ import annotations

import asyncio
import datetime
import math
import random
import sys
import uuid

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.core import User, HealthMetric, MetricTypeEnum, WearableSourceEnum, Meal  # noqa: F401
# Import all models so SQLAlchemy relationship resolution works
import app.models.health_goal   # noqa: F401
import app.models.visit_briefs   # noqa: F401
import app.models.emergency      # noqa: F401
import app.models.audit          # noqa: F401

DATABASE_URL = settings.database_url

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

rng = random.Random(42)

# ── Vietnamese meal pool (rotated day-by-day) ─────────────────────────────────
BREAKFAST_POOL = [
    {"name": "Phở bò",       "calories": 450, "protein_g": 28, "carbs_g": 55, "fat_g": 12},
    {"name": "Bánh mì trứng","calories": 310, "protein_g": 14, "carbs_g": 40, "fat_g": 11},
    {"name": "Cháo gà",      "calories": 280, "protein_g": 18, "carbs_g": 38, "fat_g":  6},
    {"name": "Bún bò Huế",   "calories": 520, "protein_g": 32, "carbs_g": 60, "fat_g": 14},
    {"name": "Xôi gà",       "calories": 420, "protein_g": 22, "carbs_g": 58, "fat_g": 10},
    {"name": "Bánh cuốn",    "calories": 350, "protein_g": 16, "carbs_g": 48, "fat_g":  9},
    {"name": "Hủ tiếu",      "calories": 390, "protein_g": 20, "carbs_g": 52, "fat_g": 10},
]

LUNCH_POOL = [
    {"name": "Cơm sườn + canh",   "calories": 680, "protein_g": 38, "carbs_g": 75, "fat_g": 20},
    {"name": "Cơm tấm bì chả",    "calories": 720, "protein_g": 40, "carbs_g": 78, "fat_g": 22},
    {"name": "Cơm gà xối mỡ",     "calories": 650, "protein_g": 36, "carbs_g": 70, "fat_g": 18},
    {"name": "Bún thịt nướng",    "calories": 560, "protein_g": 30, "carbs_g": 65, "fat_g": 15},
    {"name": "Mì xào hải sản",    "calories": 590, "protein_g": 28, "carbs_g": 68, "fat_g": 16},
    {"name": "Cơm chiên dương châu","calories": 630, "protein_g": 22, "carbs_g": 80, "fat_g": 18},
    {"name": "Bánh mì thịt",      "calories": 420, "protein_g": 22, "carbs_g": 50, "fat_g": 14},
]

SNACK_POOL = [
    {"name": "Trái cây + sữa chua","calories": 180, "protein_g":  6, "carbs_g": 32, "fat_g":  3},
    {"name": "Bánh quy + cà phê",  "calories": 220, "protein_g":  4, "carbs_g": 35, "fat_g":  8},
    {"name": "Xoài + chanh dây",   "calories": 150, "protein_g":  2, "carbs_g": 36, "fat_g":  1},
    {"name": "Sinh tố bơ",         "calories": 260, "protein_g":  4, "carbs_g": 22, "fat_g": 16},
    {"name": "Bánh mì nướng bơ",   "calories": 195, "protein_g":  5, "carbs_g": 28, "fat_g":  8},
]

DINNER_POOL = [
    {"name": "Cơm tối + canh chua", "calories": 580, "protein_g": 32, "carbs_g": 68, "fat_g": 16},
    {"name": "Lẩu gà + rau",        "calories": 500, "protein_g": 38, "carbs_g": 42, "fat_g": 18},
    {"name": "Cá kho tộ + cơm",     "calories": 540, "protein_g": 35, "carbs_g": 62, "fat_g": 14},
    {"name": "Gà nướng + salad",    "calories": 480, "protein_g": 42, "carbs_g": 30, "fat_g": 16},
    {"name": "Bún riêu",            "calories": 430, "protein_g": 24, "carbs_g": 55, "fat_g": 12},
    {"name": "Mì tom yum",          "calories": 460, "protein_g": 22, "carbs_g": 58, "fat_g": 14},
    {"name": "Cơm chiên + trứng",   "calories": 520, "protein_g": 18, "carbs_g": 70, "fat_g": 15},
]


def _utc(days_ago: int, hour: int = 8, minute: int = 0) -> datetime.datetime:
    now = datetime.datetime.now(datetime.timezone.utc)
    return (now - datetime.timedelta(days=days_ago)).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )


def _sinusoidal(base: float, amplitude: float, day: int, period: int = 7) -> float:
    return base + amplitude * math.sin(2 * math.pi * day / period)


def _jitter(value: float, pct: float = 0.05) -> float:
    return value + rng.uniform(-value * pct, value * pct)


async def seed(email: str) -> None:
    async with AsyncSessionLocal() as db:
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if user is None:
            print(f"[ERROR] User not found: {email}")
            return

        print(f"[SEED] Seeding 30 days of health data for {email} (id={user.id})")

        # ── Wipe existing data ────────────────────────────────────────────
        await db.execute(delete(HealthMetric).where(HealthMetric.user_id == user.id))
        await db.execute(delete(Meal).where(Meal.user_id == user.id))
        await db.flush()

        metrics: list[HealthMetric] = []
        meals:   list[Meal]         = []

        for day in range(30, -1, -1):  # 30 days ago → today
            ts_date = _utc(day).date()

            # ── Heart Rate (morning + evening readings) ───────────────────
            base_hr = 70.0
            # Morning resting HR
            hr_morning = _sinusoidal(base_hr, 4, day, 7)
            hr_morning = _jitter(hr_morning, 0.04)
            if day in (5, 22):          # critical tachycardia spike
                hr_morning = rng.uniform(108, 120)
            elif day in (10, 18, 25):   # mild elevation
                hr_morning = rng.uniform(92, 102)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.HEART_RATE,
                value=round(hr_morning, 1), unit="bpm",
                recorded_at=_utc(day, 7, 30),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))
            # Evening HR (slightly elevated after evening walk)
            hr_evening = hr_morning + rng.uniform(-3, 8)
            if day not in (5, 22):       # skip anomaly days for evening
                hr_evening = max(min(hr_evening, 95), 58)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.HEART_RATE,
                value=round(hr_evening, 1), unit="bpm",
                recorded_at=_utc(day, 19, 0),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))

            # ── Blood Pressure (morning + afternoon) ─────────────────────
            base_sys, base_dia = 118.0, 76.0
            sys_m = _sinusoidal(base_sys, 6, day, 10)
            dia_m = _sinusoidal(base_dia, 4, day, 10)
            sys_m = _jitter(sys_m, 0.03)
            dia_m = _jitter(dia_m, 0.03)
            if day == 12:               # hypertension spike
                sys_m = rng.uniform(148, 160)
                dia_m = rng.uniform(94, 100)
            elif day in (4, 19, 27):    # mild prehypertension
                sys_m = rng.uniform(132, 142)
                dia_m = rng.uniform(84, 90)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
                value=round(sys_m, 1), unit="mmHg",
                recorded_at=_utc(day, 7, 35),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
                value=round(dia_m, 1), unit="mmHg",
                recorded_at=_utc(day, 7, 35),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))
            # Afternoon BP (slightly higher due to activity)
            sys_pm = sys_m + rng.uniform(-2, 6)
            dia_pm = dia_m + rng.uniform(-1, 4)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
                value=round(max(sys_pm, 100), 1), unit="mmHg",
                recorded_at=_utc(day, 14, 0),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
                value=round(max(dia_pm, 60), 1), unit="mmHg",
                recorded_at=_utc(day, 14, 0),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))

            # ── Steps ─────────────────────────────────────────────────────
            weekday = _utc(day).weekday()   # 0=Mon
            base_steps = 8500 if weekday < 5 else 5500
            steps = _sinusoidal(base_steps, 1800, day, 5)
            steps = _jitter(steps, 0.15)
            if day in (3, 8, 15, 20):       # lazy days
                steps = rng.uniform(1800, 3500)
            elif day in (1, 6, 11, 24):     # active days
                steps = rng.uniform(11000, 14000)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.STEPS,
                value=round(max(steps, 500)), unit="steps",
                recorded_at=_utc(day, 22, 0),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))

            # ── Sleep ─────────────────────────────────────────────────────
            base_sleep = 435  # ~7h 15min
            sleep = _sinusoidal(base_sleep, 45, day, 7)
            sleep = _jitter(sleep, 0.07)
            if day in (2, 9, 16, 23):      # bad sleep nights
                sleep = rng.uniform(190, 290)  # < 5h
            elif day in (7, 14, 21, 28):   # recovery nights
                sleep = rng.uniform(480, 520)  # 8-9h
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.SLEEP_MINUTES,
                value=round(max(sleep, 60)), unit="min",
                recorded_at=_utc(day, 6, 30),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))

            # ── Weight (once daily, gradual downtrend) ────────────────────
            base_weight = 68.5
            weight = base_weight - (day * 0.008) + rng.uniform(-0.25, 0.25)
            metrics.append(HealthMetric(
                id=uuid.uuid4(), user_id=user.id,
                metric_type=MetricTypeEnum.WEIGHT_KG,
                value=round(weight, 1), unit="kg",
                recorded_at=_utc(day, 7, 0),
                source=WearableSourceEnum.MANUAL, is_deleted=False,
            ))

            # ── Daily meals ───────────────────────────────────────────────
            day_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=day)
            idx = day % 7

            breakfast = BREAKFAST_POOL[idx]
            lunch     = LUNCH_POOL[idx]
            dinner    = DINNER_POOL[idx]

            for meal_tpl, hour, minute in [
                (breakfast, 7, 0),
                (lunch,    12, 0),
                (dinner,   19, 0),
            ]:
                # Add small random calorie variation
                cal_var = rng.uniform(0.88, 1.12)
                meals.append(Meal(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    name=meal_tpl["name"],
                    logged_at=day_date.replace(
                        hour=hour, minute=minute, second=0, microsecond=0
                    ),
                    nutrition_result={
                        "calories":   round(meal_tpl["calories"]   * cal_var),
                        "protein_g":  round(meal_tpl["protein_g"]  * cal_var, 1),
                        "carbs_g":    round(meal_tpl["carbs_g"]    * cal_var, 1),
                        "fat_g":      round(meal_tpl["fat_g"]      * cal_var, 1),
                    },
                    status="analyzed",
                ))

            # Add afternoon snack on ~60% of days
            if rng.random() < 0.6:
                snack = SNACK_POOL[idx % len(SNACK_POOL)]
                meals.append(Meal(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    name=snack["name"],
                    logged_at=day_date.replace(hour=15, minute=30, second=0, microsecond=0),
                    nutrition_result={
                        "calories":  snack["calories"],
                        "protein_g": snack["protein_g"],
                        "carbs_g":   snack["carbs_g"],
                        "fat_g":     snack["fat_g"],
                    },
                    status="analyzed",
                ))

        for m in metrics:
            db.add(m)
        for meal in meals:
            db.add(meal)

        await db.commit()
        print(f"[SEED] Done. Inserted {len(metrics)} metric rows + {len(meals)} meals.")
        print(
            "[SEED] Anomaly schedule:\n"
            "  HR critical:   day-5, day-22 (108-120 bpm)\n"
            "  HR elevated:   day-10, day-18, day-25 (92-102 bpm)\n"
            "  BP critical:   day-12 (148-160/94-100 mmHg)\n"
            "  BP elevated:   day-4, day-19, day-27 (132-142/84-90 mmHg)\n"
            "  Bad sleep:     day-2, 9, 16, 23  (<5h)\n"
            "  Good sleep:    day-7, 14, 21, 28 (8-9h)\n"
            "  Low steps:     day-3, 8, 15, 20  (<3500)\n"
            "  High steps:    day-1, 6, 11, 24  (11k-14k)"
        )


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@healthos.local"
    asyncio.run(seed(email))

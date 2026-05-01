"""
Seed 30 days of realistic health metrics for testing the dashboard.
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

from sqlalchemy import select
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


def _utc(days_ago: int, hour: int = 8, minute: int = 0) -> datetime.datetime:
    now = datetime.datetime.now(datetime.timezone.utc)
    return (now - datetime.timedelta(days=days_ago)).replace(
        hour=hour, minute=minute, second=0, microsecond=0
    )


def _sinusoidal(base: float, amplitude: float, day: int, period: int = 7) -> float:
    """Create natural cyclical variation."""
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

        # Remove old seeded metrics to avoid duplicates
        existing = (
            await db.execute(
                select(HealthMetric).where(HealthMetric.user_id == user.id)
            )
        ).scalars().all()
        for m in existing:
            await db.delete(m)
        await db.flush()

        metrics: list[HealthMetric] = []

        for day in range(30, -1, -1):  # 30 days ago → today
            # ── Heart Rate ─────────────────────────────────────────────
            # Normal resting HR 65-75; spike on day 5, 12, 22 to simulate anomalies
            base_hr = 70.0
            hr = _sinusoidal(base_hr, 4, day, 7)
            hr = _jitter(hr, 0.04)
            if day in (5, 22):  # anomaly days
                hr = rng.uniform(105, 118)
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.HEART_RATE,
                value=round(hr, 1),
                unit="bpm",
                recorded_at=_utc(day, 7, 30),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))

            # ── Blood Pressure ──────────────────────────────────────────
            base_sys = 118.0
            base_dia = 76.0
            sys_bp = _sinusoidal(base_sys, 6, day, 10)
            dia_bp = _sinusoidal(base_dia, 4, day, 10)
            sys_bp = _jitter(sys_bp, 0.03)
            dia_bp = _jitter(dia_bp, 0.03)
            if day == 12:  # hypertension spike
                sys_bp = rng.uniform(145, 158)
                dia_bp = rng.uniform(92, 98)
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_SYSTOLIC,
                value=round(sys_bp, 1),
                unit="mmHg",
                recorded_at=_utc(day, 7, 35),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.BLOOD_PRESSURE_DIASTOLIC,
                value=round(dia_bp, 1),
                unit="mmHg",
                recorded_at=_utc(day, 7, 35),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))

            # ── Steps ───────────────────────────────────────────────────
            # Weekday variation: Mon-Fri higher, weekend lower
            weekday = (_utc(day).weekday())  # 0=Mon
            base_steps = 8500 if weekday < 5 else 5000
            steps = _sinusoidal(base_steps, 1500, day, 5)
            steps = _jitter(steps, 0.15)
            if day in (3, 8, 15, 20):  # lazy days
                steps = rng.uniform(2000, 4000)
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.STEPS,
                value=round(max(steps, 500)),
                unit="steps",
                recorded_at=_utc(day, 22, 0),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))

            # ── Sleep ───────────────────────────────────────────────────
            base_sleep = 430  # ~7h 10min
            sleep = _sinusoidal(base_sleep, 40, day, 7)
            sleep = _jitter(sleep, 0.08)
            if day in (2, 9, 16):  # bad sleep nights
                sleep = rng.uniform(200, 300)  # < 5h
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.SLEEP_MINUTES,
                value=round(max(sleep, 60)),
                unit="min",
                recorded_at=_utc(day, 6, 30),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))

            # ── Weight ──────────────────────────────────────────────────
            base_weight = 68.5
            weight = base_weight - (day * 0.01) + rng.uniform(-0.3, 0.3)  # slight downtrend
            metrics.append(HealthMetric(
                id=uuid.uuid4(),
                user_id=user.id,
                metric_type=MetricTypeEnum.WEIGHT_KG,
                value=round(weight, 1),
                unit="kg",
                recorded_at=_utc(day, 7, 0),
                source=WearableSourceEnum.MANUAL,
                is_deleted=False,
            ))

        # ── Today's meals ────────────────────────────────────────────────
        today = datetime.datetime.now(datetime.timezone.utc)
        meals_data = [
            {"name": "Phở bò", "calories": 450, "protein_g": 28, "carbs_g": 55, "fat_g": 12, "hour": 7},
            {"name": "Cơm trưa", "calories": 620, "protein_g": 35, "carbs_g": 72, "fat_g": 18, "hour": 12},
            {"name": "Bánh mì", "calories": 320, "protein_g": 15, "carbs_g": 42, "fat_g": 10, "hour": 15},
            {"name": "Cơm tối + canh", "calories": 580, "protein_g": 32, "carbs_g": 68, "fat_g": 16, "hour": 19},
        ]
        for m_data in meals_data:
            meal = Meal(
                id=uuid.uuid4(),
                user_id=user.id,
                name=m_data["name"],
                logged_at=today.replace(hour=m_data["hour"], minute=0, second=0, microsecond=0),
                nutrition_result={
                    "calories": m_data["calories"],
                    "protein_g": m_data["protein_g"],
                    "carbs_g": m_data["carbs_g"],
                    "fat_g": m_data["fat_g"],
                },
                status="analyzed",
            )
            db.add(meal)

        for m in metrics:
            db.add(m)

        await db.commit()
        print(f"[SEED] Done. Inserted {len(metrics)} metric rows + {len(meals_data)} meals.")
        print("[SEED] Anomaly days: HR spike on day-5 & day-22, BP spike on day-12, low sleep on day-2/9/16, low steps on day-3/8/15/20")


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@healthos.local"
    asyncio.run(seed(email))

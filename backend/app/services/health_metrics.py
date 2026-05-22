from __future__ import annotations

import datetime
import uuid
from typing import Literal, Optional

from sqlalchemy import Select, and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import HealthMetric, MetricTypeEnum, WearableSourceEnum
from app.services._ownership import get_owned
from app.schemas.health_metrics import (
    HealthMetricCreate,
    HealthMetricUpdate,
)


# Re-usable predicate that hides Health Connect tombstones (and any future
# soft-deleted rows) from analytics. A row goes `is_deleted=true` when HC
# reports a deletion via getChanges; without this filter, dashboards keep
# showing values the user already removed at the source. The column is
# NOT NULL with default false (migration 024), so this also matches manual
# rows that have never been touched by sync.
_NOT_DELETED = HealthMetric.is_deleted.is_(False)


def _resolve_range_to_dates(
    range_value: str | None,
) -> tuple[datetime.date | None, datetime.date | None]:
    if range_value is None:
        return None, None

    days_map = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }
    if range_value not in days_map:
        return None, None

    today = datetime.datetime.now(datetime.timezone.utc).date()
    days = days_map[range_value]
    return today - datetime.timedelta(days=days - 1), today


def _apply_filters(
    stmt: Select[tuple[HealthMetric]],
    metric_type: MetricTypeEnum | None,
    source: WearableSourceEnum | None,
    date_from: datetime.date | None,
    date_to: datetime.date | None,
) -> Select[tuple[HealthMetric]]:
    # Always hide tombstones — every list/aggregate flow funnels through here.
    stmt = stmt.where(_NOT_DELETED)

    if metric_type is not None:
        stmt = stmt.where(HealthMetric.metric_type == metric_type)

    if source is not None:
        stmt = stmt.where(HealthMetric.source == source)

    if date_from is not None:
        start_dt = datetime.datetime.combine(
            date_from,
            datetime.time.min,
            tzinfo=datetime.timezone.utc,
        )
        stmt = stmt.where(HealthMetric.recorded_at >= start_dt)

    if date_to is not None:
        end_dt = datetime.datetime.combine(
            date_to,
            datetime.time.max,
            tzinfo=datetime.timezone.utc,
        )
        stmt = stmt.where(HealthMetric.recorded_at <= end_dt)

    return stmt


async def list_health_metrics(
    db: AsyncSession,
    user_id: uuid.UUID,
    metric_type: MetricTypeEnum | None = None,
    source: WearableSourceEnum | None = None,
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    range_value: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[HealthMetric], int]:
    if range_value and date_from is None and date_to is None:
        resolved_from, resolved_to = _resolve_range_to_dates(range_value)
        date_from = resolved_from
        date_to = resolved_to

    base_stmt = select(HealthMetric).where(HealthMetric.user_id == user_id)
    base_stmt = _apply_filters(base_stmt, metric_type, source, date_from, date_to)

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    offset = (page - 1) * per_page
    data_stmt = (
        base_stmt
        .order_by(HealthMetric.recorded_at.desc(), HealthMetric.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    metrics = (await db.execute(data_stmt)).scalars().all()
    return metrics, total


# ── Aggregate by Period ───────────────────────────────────────────

async def aggregate_by_period(
    db: AsyncSession,
    user_id: uuid.UUID,
    metric_type: MetricTypeEnum,
    period: Literal["daily", "weekly", "monthly"],
    date_from: datetime.date | None,
    date_to: datetime.date | None,
) -> list[dict]:
    """
    Returns [{date, avg_value, min_value, max_value, count}] for the given period.
    Uses DATE_TRUNC for week/month grouping.
    """
    trunc_map = {"daily": "day", "weekly": "week", "monthly": "month"}
    trunc_unit = trunc_map[period]

    if date_from is None:
        date_from = datetime.datetime.now(datetime.timezone.utc).date() - datetime.timedelta(days=30)
    if date_to is None:
        date_to = datetime.datetime.now(datetime.timezone.utc).date()

    start_dt = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime.combine(date_to, datetime.time.max, tzinfo=datetime.timezone.utc)

    # Bind the date_trunc once and reuse the SAME labeled expression in
    # SELECT, GROUP BY, and ORDER BY. Without sharing the expression,
    # SQLAlchemy emits two bind parameters for `trunc_unit` and
    # PostgreSQL refuses to treat them as the same GROUP BY target
    # ("column ... must appear in GROUP BY").
    period_expr = func.date_trunc(trunc_unit, HealthMetric.recorded_at).label("period_start")

    stmt = (
        select(
            period_expr,
            func.avg(HealthMetric.value).label("avg_value"),
            func.min(HealthMetric.value).label("min_value"),
            func.max(HealthMetric.value).label("max_value"),
            func.count(HealthMetric.id).label("count"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.metric_type == metric_type,
                HealthMetric.recorded_at >= start_dt,
                HealthMetric.recorded_at <= end_dt,
                _NOT_DELETED,
            )
        )
        .group_by(period_expr)
        .order_by(period_expr)
    )
    rows = (await db.execute(stmt)).mappings().all()
    return [
        {
            "date": r.period_start.date().isoformat(),
            "avg_value": round(float(r.avg_value), 2),
            "min_value": round(float(r.min_value), 2),
            "max_value": round(float(r.max_value), 2),
            "count": r.count,
        }
        for r in rows
    ]


# ── Multi-Metric Comparison ──────────────────────────────────────

async def compare_metrics(
    db: AsyncSession,
    user_id: uuid.UUID,
    metric_types: list[MetricTypeEnum],
    date_from: datetime.date,
    date_to: datetime.date,
) -> list[dict]:
    if len(metric_types) < 2:
        raise ValueError("At least 2 metric types required")
    if len(metric_types) > 4:
        raise ValueError("At most 4 metric types allowed")

    start_dt = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime.combine(date_to, datetime.time.max, tzinfo=datetime.timezone.utc)

    # Build result dict keyed by date string
    result_map: dict[str, dict[str, object]] = {}

    for metric in metric_types:
        rows = (
            select(
                func.date(HealthMetric.recorded_at).label("d"),
                func.avg(HealthMetric.value).label("avg_val"),
            )
            .where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.metric_type == metric,
                    HealthMetric.recorded_at >= start_dt,
                    HealthMetric.recorded_at <= end_dt,
                    _NOT_DELETED,
                )
            )
            .group_by(func.date(HealthMetric.recorded_at))
        )
        for r in (await db.execute(rows)).mappings().all():
            d = r.d.isoformat() if hasattr(r.d, "isoformat") else str(r.d)
            if d not in result_map:
                result_map[d] = {"date": d, "values": {}}
            result_map[d]["values"][metric.value] = round(float(r.avg_val), 2) if r.avg_val else None

    # Fill nulls for missing metric/dates
    for entry in result_map.values():
        for metric in metric_types:
            if metric.value not in entry["values"]:
                entry["values"][metric.value] = None

    return sorted(result_map.values(), key=lambda x: x["date"])


# ── Goal Progress ────────────────────────────────────────────────

async def calculate_goal_progress(
    db: AsyncSession,
    user_id: uuid.UUID,
    metric_type: MetricTypeEnum,
    target: float,
    date_from: datetime.date,
    date_to: datetime.date,
) -> list[dict]:
    """
    Returns [{date, value (daily total), target, progress_percent}] for steps/calories.
    For metrics like steps: SUM per day. For others: AVG per day.
    """
    start_dt = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.timezone.utc)
    end_dt = datetime.datetime.combine(date_to, datetime.time.max, tzinfo=datetime.timezone.utc)

    if metric_type == MetricTypeEnum.STEPS:
        agg_func = func.sum(HealthMetric.value)
    else:
        agg_func = func.avg(HealthMetric.value)

    stmt = (
        select(
            func.date(HealthMetric.recorded_at).label("d"),
            agg_func.label("daily_value"),
        )
        .where(
            and_(
                HealthMetric.user_id == user_id,
                HealthMetric.metric_type == metric_type,
                HealthMetric.recorded_at >= start_dt,
                HealthMetric.recorded_at <= end_dt,
                _NOT_DELETED,
            )
        )
        .group_by(func.date(HealthMetric.recorded_at))
        .order_by("d")
    )
    rows = (await db.execute(stmt)).mappings().all()
    return [
        {
            "date": r.d.isoformat(),
            "value": round(float(r.daily_value), 2),
            "target": target,
            "progress_percent": round(float(r.daily_value) / target * 100, 1) if target != 0 else None,
        }
        for r in rows
    ]


# ── Period Comparison ─────────────────────────────────────────────

async def compare_periods(
    db: AsyncSession,
    user_id: uuid.UUID,
    metric_type: MetricTypeEnum,
    days: int,
) -> dict:
    """
    Compares current period (last N days) vs previous period (N days before that).
    Returns {current: PeriodStats, previous: PeriodStats, change_percent}.
    """
    now = datetime.datetime.now(datetime.timezone.utc).date()
    current_start = now - datetime.timedelta(days=days - 1)
    previous_start = current_start - datetime.timedelta(days=days)
    previous_end = current_start - datetime.timedelta(days=1)

    async def _stats(
        db: AsyncSession,
        user_id: uuid.UUID,
        metric_type: MetricTypeEnum,
        date_from: datetime.date,
        date_to: datetime.date,
    ) -> dict:
        start_dt = datetime.datetime.combine(date_from, datetime.time.min, tzinfo=datetime.timezone.utc)
        end_dt = datetime.datetime.combine(date_to, datetime.time.max, tzinfo=datetime.timezone.utc)
        stmt = (
            select(
                func.avg(HealthMetric.value).label("avg"),
                func.min(HealthMetric.value).label("min"),
                func.max(HealthMetric.value).label("max"),
                func.sum(HealthMetric.value).label("total"),
                func.count(HealthMetric.id).label("count"),
            )
            .where(
                and_(
                    HealthMetric.user_id == user_id,
                    HealthMetric.metric_type == metric_type,
                    HealthMetric.recorded_at >= start_dt,
                    HealthMetric.recorded_at <= end_dt,
                    _NOT_DELETED,
                )
            )
        )
        r = (await db.execute(stmt)).mappings().one_or_none()
        return {
            "avg_value": round(float(r.avg), 2) if r and r.avg else None,
            "min_value": round(float(r.min), 2) if r and r.min else None,
            "max_value": round(float(r.max), 2) if r and r.max else None,
            "total_value": round(float(r.total), 2) if r and r.total else 0,
            "count": r.count if r else 0,
        }

    current = await _stats(db, user_id, metric_type, current_start, now)
    previous = await _stats(db, user_id, metric_type, previous_start, previous_end)

    # Determine trend
    if previous["avg_value"] == 0 or previous["avg_value"] is None:
        change_pct = 0.0
    else:
        change_pct = round((current["avg_value"] - previous["avg_value"]) / previous["avg_value"] * 100, 1)

    if abs(change_pct) < 3:
        trend = "stable"
    elif change_pct > 0:
        trend = "improving"
    else:
        trend = "declining"

    current["trend"] = trend
    previous_trend = "declining" if trend == "improving" else "improving" if trend == "declining" else "stable"
    previous["trend"] = previous_trend

    return {
        "current": {**current, "period": "current"},
        "previous": {**previous, "period": "previous"},
        "change_percent": change_pct,
    }


# ── CRUD ──────────────────────────────────────────────────────────

async def create_health_metric(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: HealthMetricCreate,
) -> HealthMetric:
    metric = HealthMetric(
        id=uuid.uuid4(),
        user_id=user_id,
        metric_type=data.metric_type,
        value=data.value,
        unit=data.unit,
        recorded_at=data.recorded_at,
        source=data.source,
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric


async def update_health_metric(
    db: AsyncSession,
    metric_id: uuid.UUID,
    user_id: uuid.UUID,
    data: HealthMetricUpdate,
) -> HealthMetric | None:
    metric = await get_owned(db, HealthMetric, id_=metric_id, user_id=user_id)
    if metric is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(metric, field, value)
    await db.commit()
    await db.refresh(metric)
    return metric

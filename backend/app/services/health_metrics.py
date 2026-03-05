from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import HealthMetric, MetricTypeEnum, WearableSourceEnum


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

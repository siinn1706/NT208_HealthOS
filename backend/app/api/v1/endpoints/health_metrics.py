"""Health metrics endpoints — placeholder."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/health-metrics", tags=["Health Metrics"])


@router.get("")
async def list_health_metrics() -> dict:
    """
    TODO:
      1. Auth check
      2. Parse filters (metric_type, date range, source)
      3. Query from DB with Redis cache (TTL 5 min)
      4. Return PaginatedResponse[HealthMetric]
    """
    raise HTTPException(status_code=501, detail={"code": "NOT_IMPLEMENTED", "message": "Coming soon."})

"""v1 API router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import health, users, meals, health_metrics

router = APIRouter(prefix="/v1")

router.include_router(health.router)
router.include_router(users.router)
router.include_router(meals.router)
router.include_router(health_metrics.router)

"""v1 API router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    appointments,
    auth,
    conversations,
    dashboard,
    devices,
    health,
    health_insights,
    health_metrics,
    meals,
    nutrition,
    reminders,
    reports,
    users,
    vitals,
)

router = APIRouter(prefix="/v1")

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(meals.router)
router.include_router(health_metrics.router)
router.include_router(conversations.router)
router.include_router(appointments.router)
router.include_router(reminders.router)
router.include_router(devices.router)
router.include_router(dashboard.router)
router.include_router(vitals.router)
router.include_router(nutrition.router)
router.include_router(health_insights.router)
router.include_router(reports.router)

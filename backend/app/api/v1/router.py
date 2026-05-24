"""v1 API router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1 import chat_rest, chat_ws
from app.api.v1.endpoints import (
    appointments,
    auth,
    conversations,
    dashboard,
    devices,
    emergency,
    emergency_public,
    goals,
    health,
    health_goals,
    health_insights,
    health_metrics,
    meals,
    medications,
    mfa,
    notifications,
    nutrition,
    preferences,
    prescriptions,
    reminders,
    reports,
    security_logs,
    users,
    visit_briefs,
    vitals,
    wearables,
    chat,
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
router.include_router(wearables.router)
router.include_router(dashboard.router)
router.include_router(vitals.router)
router.include_router(nutrition.router)
router.include_router(health_insights.router)
router.include_router(goals.router)
router.include_router(health_goals.router)
router.include_router(reports.router)
router.include_router(mfa.router)
router.include_router(security_logs.router)
router.include_router(preferences.router)
router.include_router(notifications.router)
router.include_router(prescriptions.router)
router.include_router(medications.router)
router.include_router(visit_briefs.router)
router.include_router(chat.router)
router.include_router(emergency.router)
router.include_router(emergency_public.router)
router.include_router(chat_rest.router)
router.include_router(chat_ws.router)

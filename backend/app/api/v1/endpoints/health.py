"""Health check endpoint."""
from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}

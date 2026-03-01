"""Meals endpoints — placeholder."""
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/meals", tags=["Meals"])


@router.get("")
async def list_meals() -> dict:
    """
    TODO:
      1. Auth check
      2. Query DB for user's meals (MealService)
      3. Return PaginatedResponse[MealResponse]
    """
    raise HTTPException(status_code=501, detail={"code": "NOT_IMPLEMENTED", "message": "Coming soon."})


@router.post("", status_code=201)
async def create_meal() -> dict:
    """
    TODO:
      1. Validate multipart form (name, optional image)
      2. Save meal metadata to DB
      3. Upload image to Object Storage if provided
      4. Enqueue process_meal_image Celery task
      5. Return MealResponse with status='processing'
    """
    raise HTTPException(status_code=501, detail={"code": "NOT_IMPLEMENTED", "message": "Coming soon."})

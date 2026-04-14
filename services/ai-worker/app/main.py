"""AI Worker — FastAPI application entry point."""
from fastapi import FastAPI

from app.api.generate import router as ai_router

app = FastAPI(title="HealthOS AI Worker", version="0.1.0")
app.include_router(ai_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ai-worker"}


@app.post("/analyze")
async def analyze_meal(body: dict) -> dict:
    """
    TODO: Implement food recognition + nutrition estimation.

    Expected input:
      { "meal_id": "uuid", "image_url": "s3://..." }

    Expected output:
      { "meal_id": "uuid", "status": "analyzed", "nutrition": { ... } }

    Steps:
      1. Download image from Object Storage (adapters/storage.py)
      2. Run food recognition model (tasks/food_recognition.py)
      3. Estimate nutrition (tasks/nutrition_estimation.py)
      4. Return result — Core BE will persist + publish WS event
    """
    return {
        "meal_id": body.get("meal_id"),
        "status": "analyzed",
        "nutrition": {
            "calories": 0.0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
            "confidence": 0.0,
        },
    }

from typing import Any

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_analyze_endpoint_success(monkeypatch: Any) -> None:
    class StubRaw:
        dish_name = "Pho bo"
        serving_type = "1 serving"
        calories = 450.0
        calorie_min = 390.0
        calorie_max = 520.0
        protein_g = None
        carbs_g = None
        fat_g = 12.0
        saturates_g = 4.0
        sugar_g = 3.0
        salt_g = 1.1
        confidence = 0.91
        source = "yolo"
        ingredients = []
        portion_estimate = "medium"
        portion_options = []
        warnings = ["Confirm portion"]

    def fake_load_image_from_url(image_url: str, timeout_seconds: float) -> object:
        return object()

    def fake_detect_food_nutrition(image: object) -> StubRaw:
        return StubRaw()

    monkeypatch.setattr("app.main.load_image_from_url", fake_load_image_from_url)
    monkeypatch.setattr("app.main.detect_food_nutrition", fake_detect_food_nutrition)

    response = client.post(
        "/analyze",
        json={"meal_id": "meal-1", "image_url": "https://example.com/image.jpg"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["meal_id"] == "meal-1"
    assert payload["status"] == "analyzed"
    assert payload["nutrition"]["dish_name"] == "Pho bo"
    assert payload["nutrition"]["calories"] == 450.0
    assert payload["nutrition"]["calorie_min"] == 390.0
    assert payload["nutrition"]["calorie_max"] == 520.0
    assert payload["nutrition"]["saturates_g"] == 4.0
    assert payload["nutrition"]["warnings"] == ["Confirm portion"]


def test_analyze_endpoint_bad_image(monkeypatch: Any) -> None:
    from app.services.image_loader import ImageLoadError

    def fake_load_image_from_url(image_url: str, timeout_seconds: float) -> object:
        raise ImageLoadError("bad image")

    monkeypatch.setattr("app.main.load_image_from_url", fake_load_image_from_url)

    response = client.post(
        "/analyze",
        json={"meal_id": "meal-1", "image_url": "https://example.com/not-image"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "IMAGE_LOAD_FAILED"

"""Contract checks for `/v1/meals` detail/update/ingredients endpoints."""
from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select

from app.adapters.database import AsyncSessionLocal, engine
from app.adapters.redis_client import get_redis
from app.api.v1.endpoints import meals as meals_endpoint
from app.core.security import get_current_user
from app.main import app
from app.models.core import Meal, MealStatusEnum, User
from app.tasks.meal_analysis import _validate_nutrition


class _MemoryRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def set(self, key: str, value: str, *, nx: bool = False, ex: int | None = None):
        _ = ex
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def delete(self, key: str):
        existed = key in self.values
        self.values.pop(key, None)
        return int(existed)


@pytest_asyncio.fixture
async def anonymous_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def meal_api_state():
    user_id = uuid.uuid4()
    async with AsyncSessionLocal() as db:
        db.add(
            User(
                id=user_id,
                email=f"meals-{user_id.hex[:8]}@local",
                username=f"meals_{user_id.hex[:8]}",
                display_name="Meals Test User",
                hashed_password="x",
            )
        )
        await db.commit()

    fake_user = SimpleNamespace(id=user_id, email="meals@local", hashed_password="x")
    redis = _MemoryRedis()

    async def override_user():
        return fake_user

    app.dependency_overrides[get_current_user] = override_user
    app.dependency_overrides[get_redis] = lambda: redis
    try:
        yield SimpleNamespace(user=fake_user, redis=redis)
    finally:
        app.dependency_overrides.clear()
        async with AsyncSessionLocal() as db:
            await db.execute(delete(Meal).where(Meal.user_id == user_id))
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()
        await engine.dispose()


@pytest_asyncio.fixture
async def authed_client(meal_api_state):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def _load_meal(meal_id: uuid.UUID) -> Meal | None:
    async with AsyncSessionLocal() as db:
        return await db.get(Meal, meal_id)


def _manual_meal_payload() -> dict:
    return {
        "name": "Brown rice chicken bowl",
        "meal_type": "lunch",
        "logged_at": "2026-05-28T06:30:00+00:00",
        "notes": "Less salt",
        "ingredients": [
            {
                "ingredient_name": "Brown rice",
                "ingredient_name_en": "Brown rice",
                "grams": 150,
                "manual_calories": 165,
                "is_matched": True,
            },
            {
                "ingredient_name": "Chicken breast",
                "grams": 120,
                "manual_calories": 198,
            },
        ],
    }


@pytest.mark.asyncio
async def test_meal_detail_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.get(f"/v1/meals/{uuid.uuid4()}")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_meal_patch_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": "Updated"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_meal_ingredients_requires_auth(anonymous_client: AsyncClient):
    res = await anonymous_client.get(f"/v1/meals/{uuid.uuid4()}/ingredients")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_unknown_meal_returns_404(authed_client: AsyncClient):
    meal_id = uuid.uuid4()
    res_detail = await authed_client.get(f"/v1/meals/{meal_id}")
    assert res_detail.status_code == 404
    res_patch = await authed_client.patch(f"/v1/meals/{meal_id}", json={"name": "Updated"})
    assert res_patch.status_code == 404
    res_ing = await authed_client.get(f"/v1/meals/{meal_id}/ingredients")
    assert res_ing.status_code == 404


@pytest.mark.asyncio
async def test_patch_rejects_empty_name(authed_client: AsyncClient):
    res = await authed_client.patch(f"/v1/meals/{uuid.uuid4()}", json={"name": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_json_create_persists_after_request_close(
    authed_client: AsyncClient,
    meal_api_state,
):
    logged_at = "2026-05-28T06:30:00+00:00"
    res = await authed_client.post(
        "/v1/meals",
        json={"name": "Persistence bowl", "logged_at": logged_at, "notes": "Fresh session proof"},
    )

    assert res.status_code == 201
    meal_id = uuid.UUID(res.json()["data"]["id"])

    row = await _load_meal(meal_id)
    assert row is not None
    assert row.user_id == meal_api_state.user.id
    assert row.name == "Persistence bowl"
    assert row.logged_at == datetime.datetime.fromisoformat(logged_at)


@pytest.mark.asyncio
async def test_manual_payload_persists_nutrition_and_ingredients(
    authed_client: AsyncClient,
):
    res = await authed_client.post("/v1/meals", json=_manual_meal_payload())

    assert res.status_code == 201
    meal_id = uuid.UUID(res.json()["data"]["id"])

    row = await _load_meal(meal_id)
    assert row is not None
    nutrition = row.nutrition_result
    assert nutrition is not None
    assert nutrition["source"] == "manual"
    assert nutrition["dish_name"] == "Brown rice chicken bowl"
    assert nutrition["meal_type"] == "lunch"
    assert nutrition["serving_type"] == "lunch"
    assert nutrition["notes"] == "Less salt"
    assert nutrition["calories"] == 363
    assert nutrition["ingredients"][0]["name"] == "Brown rice"
    assert nutrition["ingredients"][0]["calories"] == 165

    ing_res = await authed_client.get(f"/v1/meals/{meal_id}/ingredients")
    assert ing_res.status_code == 200
    assert ing_res.json()["data"] == [
        {
            "name": "Brown rice",
            "grams": 150.0,
            "kcal": 165.0,
            "carbs_g": 20.625,
            "protein_g": 6.1875,
            "fat_g": 6.416666666666666,
        },
        {
            "name": "Chicken breast",
            "grams": 120.0,
            "kcal": 198.0,
            "carbs_g": 24.75,
            "protein_g": 7.425,
            "fat_g": 7.699999999999999,
        },
    ]


@pytest.mark.asyncio
async def test_create_idempotency_replay_returns_committed_row_once(
    authed_client: AsyncClient,
    meal_api_state,
):
    key = str(uuid.uuid4())
    headers = {"Idempotency-Key": key}
    payload = _manual_meal_payload()

    first = await authed_client.post("/v1/meals", json=payload, headers=headers)
    replay = await authed_client.post("/v1/meals", json=payload, headers=headers)

    assert first.status_code == 201
    assert replay.status_code == 201
    assert replay.json()["data"]["id"] == first.json()["data"]["id"]

    async with AsyncSessionLocal() as db:
        count = (
            await db.execute(
                select(func.count()).select_from(Meal).where(Meal.user_id == meal_api_state.user.id)
            )
        ).scalar_one()
    assert count == 1


@pytest.mark.asyncio
async def test_photo_create_still_persists_job_id(
    authed_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(meals_endpoint, "upload_file", lambda **kwargs: "meals/test-photo.png")
    monkeypatch.setattr(
        meals_endpoint.analyze_meal_image,
        "delay",
        MagicMock(return_value=SimpleNamespace(id="job-photo-1")),
    )

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    res = await authed_client.post(
        "/v1/meals",
        data={"name": "Photo meal"},
        files={"image": ("meal.png", png_bytes, "image/png")},
    )

    assert res.status_code == 201
    assert res.json()["data"]["status"] == "processing"
    meal_id = uuid.UUID(res.json()["data"]["id"])
    row = await _load_meal(meal_id)
    assert row is not None
    assert row.image_url == "meals/test-photo.png"
    assert row.job_id == "job-photo-1"
    assert row.status == MealStatusEnum.PROCESSING


@pytest.mark.asyncio
async def test_analyze_photo_persists_processing_status(
    authed_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(meals_endpoint, "upload_file", lambda **kwargs: "meals/analyze-photo.png")
    monkeypatch.setattr(
        meals_endpoint.analyze_meal_image,
        "delay",
        MagicMock(return_value=SimpleNamespace(id="job-analyze-1")),
    )

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    res = await authed_client.post(
        "/v1/meals/analyze-photo",
        data={"name": "Analyze photo meal"},
        files={"image": ("meal.png", png_bytes, "image/png")},
    )

    assert res.status_code == 202
    payload = res.json()
    assert payload["job_id"] == "job-analyze-1"
    assert payload["status"] == "processing"
    meal_id = uuid.UUID(payload["meal_id"])
    row = await _load_meal(meal_id)
    assert row is not None
    assert row.job_id == "job-analyze-1"
    assert row.status == MealStatusEnum.PROCESSING


@pytest.mark.asyncio
async def test_photo_create_enqueue_failure_does_not_commit_pending_row(
    meal_api_state,
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(meals_endpoint, "upload_file", lambda **kwargs: "meals/enqueue-failed.png")
    monkeypatch.setattr(
        meals_endpoint.analyze_meal_image,
        "delay",
        MagicMock(side_effect=RuntimeError("broker unavailable")),
    )

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/v1/meals",
            data={"name": "Failed queued meal"},
            files={"image": ("meal.png", png_bytes, "image/png")},
        )

    assert res.status_code == 500
    async with AsyncSessionLocal() as db:
        count = (
            await db.execute(
                select(func.count()).select_from(Meal).where(Meal.user_id == meal_api_state.user.id)
            )
        ).scalar_one()
    assert count == 0


def test_ai_nutrition_validation_preserves_valid_ingredients():
    nutrition = _validate_nutrition(
        {
            "dish_name": "Chicken bowl",
            "calories": 512,
            "ingredients": [
                {
                    "name": "Chicken breast",
                    "grams": 120,
                    "kcal": 198,
                    "protein_g": 37.2,
                    "carbs_g": 0,
                    "fat_g": 4.3,
                    "confidence": 0.88,
                    "unexpected": {"nested": "drop"},
                },
                "invalid",
                {"name": None, "grams": "many"},
            ],
        }
    )

    assert nutrition["dish_name"] == "Chicken bowl"
    assert nutrition["calories"] == 512.0
    assert nutrition["ingredients"] == [
        {
            "name": "Chicken breast",
            "grams": 120.0,
            "kcal": 198.0,
            "protein_g": 37.2,
            "carbs_g": 0.0,
            "fat_g": 4.3,
            "confidence": 0.88,
        }
    ]


@pytest.mark.asyncio
async def test_manual_payload_rejects_invalid_ingredient_numbers(
    authed_client: AsyncClient,
):
    payload = _manual_meal_payload()
    payload["ingredients"][0]["grams"] = -1

    res = await authed_client.post("/v1/meals", json=payload)

    assert res.status_code in {400, 422}

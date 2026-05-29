from __future__ import annotations

import pytest

from app.services import dashboard


class _FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {
            "suggestions": [
                {
                    "id": "bad-priority",
                    "type": "tip",
                    "icon": "Dumbbell",
                    "title": "Bad priority",
                    "message": "Bad priority",
                    "priority": "not-a-number",
                    "duration_minutes": 20,
                    "intensity": "low",
                    "category": "cardio",
                }
            ]
        }


class _FakeClient:
    def __init__(self, *_args, **_kwargs) -> None:
        self.requests: list[dict] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        return False

    async def post(self, _url: str, *, json: dict) -> _FakeResponse:
        self.requests.append(json)
        return _FakeResponse()


@pytest.mark.asyncio
async def test_call_ai_worker_exercise_raises_when_ai_items_parse_skip(monkeypatch):
    monkeypatch.setattr(dashboard.httpx, "AsyncClient", _FakeClient)

    with pytest.raises(ValueError, match="malformed exercise suggestions"):
        await dashboard._call_ai_worker_exercise({"risk_level": "routine"}, locale="en")

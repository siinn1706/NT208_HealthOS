"""Tests for GET/PATCH /v1/preferences/me including locale (no live Postgres required)."""

import uuid
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.adapters.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.models.core import UserPreference
from app.schemas.preferences import UserPreferenceData, UserPreferenceUpdate


@pytest.fixture
def authenticated_user():
    return type(
        "User",
        (),
        {
            "id": uuid.uuid4(),
            "email": "prefs@example.com",
            "hashed_password": "fake",
        },
    )()


@pytest_asyncio.fixture
async def authenticated_client(authenticated_user):
    async def override_get_current_user():
        return authenticated_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_preferences_me_requires_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/v1/preferences/me")
    assert res.status_code == 401


def test_user_preference_data_includes_locale_default():
    d = UserPreferenceData()
    assert d.locale == "en"


def test_user_preference_update_rejects_invalid_locale():
    with pytest.raises(ValidationError):
        UserPreferenceUpdate(locale="fr")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_get_preferences_includes_locale(authenticated_user, authenticated_client):
    class _Result:
        def __init__(self, pref: Any):
            self._pref = pref

        def scalar_one_or_none(self):
            return self._pref

    class _FakeSession:
        def __init__(self):
            self.pref: UserPreference | None = None

        async def execute(self, _stmt: object):
            return _Result(self.pref)

        def add(self, obj: UserPreference) -> None:
            self.pref = obj

        async def commit(self) -> None:
            return None

        async def refresh(self, _obj: UserPreference) -> None:
            return None

    session = _FakeSession()

    async def override_db():
        yield session

    app.dependency_overrides[get_db] = override_db
    try:
        res = await authenticated_client.get("/v1/preferences/me")
        assert res.status_code == 200
        body = res.json()["data"]
        assert body["theme_mode"] == "system"
        assert body["locale"] == "en"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_patch_preferences_accepts_locale(authenticated_user, authenticated_client):
    class _Result:
        def __init__(self, pref: Any):
            self._pref = pref

        def scalar_one_or_none(self):
            return self._pref

    class _FakeSession:
        def __init__(self):
            self.pref: UserPreference | None = None

        async def execute(self, _stmt: object):
            return _Result(self.pref)

        def add(self, obj: UserPreference) -> None:
            self.pref = obj

        async def commit(self) -> None:
            return None

        async def refresh(self, _obj: UserPreference) -> None:
            return None

    session = _FakeSession()

    async def override_db():
        yield session

    app.dependency_overrides[get_db] = override_db
    try:
        res = await authenticated_client.patch("/v1/preferences/me", json={"locale": "vi"})
        assert res.status_code == 200
        assert res.json()["data"]["locale"] == "vi"
        assert session.pref is not None
        assert session.pref.locale == "vi"
    finally:
        app.dependency_overrides.pop(get_db, None)

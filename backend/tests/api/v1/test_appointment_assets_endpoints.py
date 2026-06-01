"""Endpoint contract tests for generic appointment assets."""
from __future__ import annotations

import datetime
import uuid
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.adapters.database import AsyncSessionLocal, engine
from app.adapters.redis_client import get_redis
from app.core.config import settings
from app.core.security import get_current_user
from app.main import app
from app.api.v1.endpoints import appointment_assets as assets_endpoint
from app.models.audit import AuditLog
from app.models.core import Appointment, AppointmentStatusEnum, User
from app.services import appointment_assets as asset_svc


requires_database = pytest.mark.skipif(
    not settings.database_url,
    reason="needs real Postgres",
)


class _FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def set(self, key: str, value, *, nx: bool = False, ex: int | None = None):
        if nx and key in self.values:
            return None
        self.values[key] = value
        return True

    async def delete(self, key: str) -> int:
        return 1 if self.values.pop(key, None) is not None else 0

    async def eval(self, _script: str, _numkeys: int, key: str, *_args):
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur

    async def incr(self, key: str) -> int:
        cur = int(self.values.get(key, "0")) + 1
        self.values[key] = str(cur)
        return cur

    async def expire(self, _key: str, _seconds: int) -> bool:
        return True

    async def ttl(self, _key: str) -> int:
        return -1


@pytest_asyncio.fixture
async def anonymous_client():
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_redis, None)


@pytest_asyncio.fixture
async def appointment_asset_state():
    user_ids: list[uuid.UUID] = []
    async with AsyncSessionLocal() as db:
        owner = User(
            email=f"asset-owner-{uuid.uuid4().hex[:8]}@test.local",
            username=f"asset_owner_{uuid.uuid4().hex[:8]}",
            display_name="Asset Owner",
            hashed_password="x",
        )
        other = User(
            email=f"asset-other-{uuid.uuid4().hex[:8]}@test.local",
            username=f"asset_other_{uuid.uuid4().hex[:8]}",
            display_name="Asset Other",
            hashed_password="x",
        )
        db.add_all([owner, other])
        await db.flush()
        appointment = Appointment(
            user_id=owner.id,
            appointment_date=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=3),
            doctor_name="Dr Asset",
            status=AppointmentStatusEnum.UPCOMING,
        )
        db.add(appointment)
        await db.commit()
        user_ids.extend([owner.id, other.id])
        yield owner.id, other.id, appointment.id

    async with AsyncSessionLocal() as cleanup:
        await cleanup.execute(delete(AuditLog).where(AuditLog.user_id.in_(user_ids)))
        await cleanup.execute(delete(User).where(User.id.in_(user_ids)))
        await cleanup.commit()
    await engine.dispose()


async def _request_as_user(
    user_id: uuid.UUID,
    method: str,
    path: str,
    *,
    files=None,
    data=None,
):
    fake = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake

    async def override():
        return SimpleNamespace(id=user_id, email=f"{user_id}@test.local", hashed_password="x")

    app.dependency_overrides[get_current_user] = override
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.request(method, path, files=files, data=data)
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


@pytest.mark.asyncio
async def test_appointment_assets_require_auth(anonymous_client: AsyncClient):
    response = await anonymous_client.get(f"/v1/appointments/{uuid.uuid4()}/assets")
    assert response.status_code == 401


@requires_database
@pytest.mark.asyncio
async def test_upload_list_signed_url_and_delete_asset(monkeypatch: pytest.MonkeyPatch, appointment_asset_state):
    owner_id, _other_id, appointment_id = appointment_asset_state
    uploaded: list[tuple[str, str, str]] = []

    def fake_upload_file(**kwargs):
        uploaded.append((kwargs["bucket"], kwargs["key"], kwargs["content_type"]))
        return "stored"

    monkeypatch.setattr(asset_svc, "upload_file", fake_upload_file)
    monkeypatch.setattr(asset_svc, "get_presigned_get_url", lambda **kwargs: "https://signed.example/report.pdf")
    monkeypatch.setattr(asset_svc, "delete_object", lambda _bucket, _key: None)

    path = f"/v1/appointments/{appointment_id}/assets"
    upload = await _request_as_user(
        owner_id,
        "POST",
        path,
        data={"kind": "lab_report"},
        files={"file": ("report.pdf", b"%PDF-1.4\nbody", "application/pdf")},
    )

    assert upload.status_code == 201
    uploaded_body = upload.json()["data"]
    assert uploaded_body["kind"] == "lab_report"
    assert uploaded_body["original_filename"] == "report.pdf"
    assert "url" not in uploaded_body
    assert uploaded and uploaded[0][2] == "application/pdf"

    listed = await _request_as_user(owner_id, "GET", f"{path}?kind=lab_report")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["data"]] == [uploaded_body["id"]]

    all_lab_reports = await _request_as_user(owner_id, "GET", "/v1/appointment-assets?kind=lab_report")
    assert all_lab_reports.status_code == 200
    assert [item["id"] for item in all_lab_reports.json()["data"]] == [uploaded_body["id"]]

    signed = await _request_as_user(owner_id, "GET", f"{path}/{uploaded_body['id']}/url")
    assert signed.status_code == 200
    assert signed.json()["data"]["url"] == "https://signed.example/report.pdf"

    deleted = await _request_as_user(owner_id, "DELETE", f"{path}/{uploaded_body['id']}")
    assert deleted.status_code == 204

    listed_after_delete = await _request_as_user(owner_id, "GET", path)
    assert listed_after_delete.status_code == 200
    assert listed_after_delete.json()["data"] == []


@requires_database
@pytest.mark.asyncio
async def test_appointment_assets_are_owner_scoped(monkeypatch: pytest.MonkeyPatch, appointment_asset_state):
    owner_id, other_id, appointment_id = appointment_asset_state
    monkeypatch.setattr(asset_svc, "upload_file", lambda **_kwargs: "stored")

    upload = await _request_as_user(
        owner_id,
        "POST",
        f"/v1/appointments/{appointment_id}/assets",
        files={"file": ("note.pdf", b"%PDF-1.4\nbody", "application/pdf")},
    )
    asset_id = upload.json()["data"]["id"]

    for method, path in [
        ("GET", f"/v1/appointments/{appointment_id}/assets"),
        ("GET", f"/v1/appointments/{appointment_id}/assets/{asset_id}/url"),
        ("DELETE", f"/v1/appointments/{appointment_id}/assets/{asset_id}"),
    ]:
        response = await _request_as_user(other_id, method, path)
        assert response.status_code == 404

    cross_upload = await _request_as_user(
        other_id,
        "POST",
        f"/v1/appointments/{appointment_id}/assets",
        files={"file": ("note.pdf", b"%PDF-1.4\nbody", "application/pdf")},
    )
    assert cross_upload.status_code == 404


@requires_database
@pytest.mark.asyncio
async def test_upload_rejects_bad_kind_and_mime(monkeypatch: pytest.MonkeyPatch, appointment_asset_state):
    owner_id, _other_id, appointment_id = appointment_asset_state
    def storage_call(**_kwargs):
        pytest.fail("invalid uploads must not reach object storage")

    monkeypatch.setattr(asset_svc, "upload_file", storage_call)

    bad_kind = await _request_as_user(
        owner_id,
        "POST",
        f"/v1/appointments/{appointment_id}/assets",
        data={"kind": "insurance"},
        files={"file": ("note.pdf", b"%PDF-1.4\nbody", "application/pdf")},
    )
    assert bad_kind.status_code == 422

    bad_mime = await _request_as_user(
        owner_id,
        "POST",
        f"/v1/appointments/{appointment_id}/assets",
        files={"file": ("note.txt", b"plain text", "text/plain")},
    )
    assert bad_mime.status_code == 415


@requires_database
@pytest.mark.asyncio
async def test_upload_cleans_storage_when_audit_fails(monkeypatch: pytest.MonkeyPatch, appointment_asset_state):
    owner_id, _other_id, appointment_id = appointment_asset_state
    uploaded: list[tuple[str, str]] = []
    deleted: list[tuple[str, str]] = []

    def fake_upload_file(**kwargs):
        uploaded.append((kwargs["bucket"], kwargs["key"]))
        return "stored"

    def fake_delete_object(bucket: str, key: str):
        deleted.append((bucket, key))

    async def fail_audit(**_kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(asset_svc, "upload_file", fake_upload_file)
    monkeypatch.setattr(asset_svc, "delete_object", fake_delete_object)
    monkeypatch.setattr(assets_endpoint, "audit", fail_audit)

    with pytest.raises(RuntimeError, match="audit unavailable"):
        await _request_as_user(
            owner_id,
            "POST",
            f"/v1/appointments/{appointment_id}/assets",
            files={"file": ("note.pdf", b"%PDF-1.4\nbody", "application/pdf")},
        )

    assert uploaded
    assert deleted == uploaded


@requires_database
@pytest.mark.asyncio
async def test_delete_fails_closed_when_object_delete_fails(monkeypatch: pytest.MonkeyPatch, appointment_asset_state):
    owner_id, _other_id, appointment_id = appointment_asset_state
    monkeypatch.setattr(asset_svc, "upload_file", lambda **_kwargs: "stored")

    upload = await _request_as_user(
        owner_id,
        "POST",
        f"/v1/appointments/{appointment_id}/assets",
        files={"file": ("note.pdf", b"%PDF-1.4\nbody", "application/pdf")},
    )
    asset_id = upload.json()["data"]["id"]

    def fail_delete_object(_bucket: str, _key: str):
        raise RuntimeError("storage down")

    monkeypatch.setattr(asset_svc, "delete_object", fail_delete_object)

    deleted = await _request_as_user(owner_id, "DELETE", f"/v1/appointments/{appointment_id}/assets/{asset_id}")

    assert deleted.status_code == 503
    assert "STORAGE_DELETE_FAILED" in str(deleted.json())

    listed = await _request_as_user(owner_id, "GET", f"/v1/appointments/{appointment_id}/assets")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()["data"]] == [asset_id]

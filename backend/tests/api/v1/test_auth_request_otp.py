"""Regression tests for auth OTP request flow."""

import inspect
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.v1.endpoints import auth as auth_endpoints
from app.api.v1.endpoints import users as users_endpoints
from app.api.v1.endpoints.auth import OTP_TTL_SECONDS, request_email_otp
from app.main import app
from app.models.core import User
from app.schemas.auth import RequestOtpBody, VerifyOtpBody
from app.services.otp import hash_otp_code


class _FakeResult:
    def scalar_one_or_none(self):
        return None


class _FakeDbSession:
    async def execute(self, stmt):
        # The endpoint should still query for user existence with a User select.
        assert isinstance(stmt, type(select(User)))
        return _FakeResult()


class _FakeSessionContext:
    async def __aenter__(self):
        return _FakeDbSession()

    async def __aexit__(self, exc_type, exc, tb):
        return False


class _FakeRedis:
    def __init__(self):
        self.values: dict[str, str] = {}

    async def exists(self, key: str) -> int:
        return 1 if key in self.values else 0

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.values[key] = value

    async def get(self, key: str):
        return self.values.get(key)

    async def getdel(self, key: str):
        return self.values.pop(key, None)

    async def delete(self, key: str):
        existed = key in self.values
        self.values.pop(key, None)
        return int(existed)


class _UserResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeVerifyDb:
    def __init__(self, user):
        self.user = user
        self.commits = 0

    async def execute(self, _stmt):
        return _UserResult(self.user)

    async def flush(self):
        pass

    async def commit(self):
        self.commits += 1


class _FakeDeleteDb:
    def __init__(self):
        self.commits = 0

    async def flush(self):
        pass

    async def commit(self):
        self.commits += 1


class _FakeOtpRecord:
    def __init__(self, code: str = "123456"):
        self.code_hash = hash_otp_code(code)
        self.attempts_left = 5
        self.consumed_at = None


def _request():
    return SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={"user-agent": "pytest"})


def _delete_user():
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="delete@example.com",
        username="delete_user",
        display_name="Delete User",
        has_password=False,
        purge_at=None,
        banned_at=None,
        banned_until=None,
    )


@pytest.mark.asyncio
async def test_request_otp_reset_password_unknown_email_returns_generic_success(monkeypatch):
    """Unknown email in reset_password flow must not error or enumerate accounts."""
    import app.adapters.database as db_module

    monkeypatch.setattr(db_module, "AsyncSessionLocal", lambda: _FakeSessionContext())

    redis = _FakeRedis()
    body = RequestOtpBody(email="unknown@example.com", purpose="reset_password")

    res = await request_email_otp(body=body, redis=redis, _rate=None)

    assert res.data.delivery == "email"
    assert res.data.expires_in_seconds == OTP_TTL_SECONDS
    assert res.data.otp is None
    assert redis.values["auth:otp:cooldown:reset_password:unknown@example.com"] == "1"


def test_request_otp_uses_cryptographic_rng():
    source = inspect.getsource(auth_endpoints.request_email_otp)

    assert "secrets.randbelow" in source
    assert "random.randint" not in source


def test_delete_account_otp_purpose_is_schema_supported():
    assert RequestOtpBody(email="delete@example.com", purpose="delete_account").purpose == "delete_account"
    assert (
        VerifyOtpBody(email="delete@example.com", purpose="delete_account", code="123456").purpose
        == "delete_account"
    )


@pytest.mark.asyncio
async def test_verify_otp_delete_account_creates_consumable_marker(monkeypatch):
    user = _delete_user()
    db = _FakeVerifyDb(user)
    otp_record = _FakeOtpRecord()
    redis = _FakeRedis()
    redis.values["auth:otp:delete_account:delete@example.com"] = hash_otp_code("123456")

    async def _audit_record(*_args, **_kwargs):
        return otp_record

    monkeypatch.setattr(auth_endpoints, "get_latest_active_otp", _audit_record)

    response = await auth_endpoints.verify_email_otp(
        body=VerifyOtpBody(email="delete@example.com", purpose="delete_account", code="123456"),
        request=_request(),
        redis=redis,
        db=db,
    )

    assert response.data.email == "delete@example.com"
    assert response.data.next_step == "delete_account"
    assert "auth:otp:delete_account:delete@example.com" not in redis.values
    assert redis.values["auth:otp:delete_account_verified:delete@example.com"] == "1"
    assert otp_record.consumed_at is not None
    assert db.commits == 1


@pytest.mark.asyncio
async def test_verified_delete_account_otp_code_cannot_be_reused_inline(monkeypatch):
    user = _delete_user()
    verify_db = _FakeVerifyDb(user)
    otp_record = _FakeOtpRecord()
    redis = _FakeRedis()
    redis.values["auth:otp:delete_account:delete@example.com"] = hash_otp_code("123456")

    async def _auth_audit_record(*_args, **_kwargs):
        return otp_record

    monkeypatch.setattr(auth_endpoints, "get_latest_active_otp", _auth_audit_record)

    await auth_endpoints.verify_email_otp(
        body=VerifyOtpBody(email="delete@example.com", purpose="delete_account", code="123456"),
        request=_request(),
        redis=redis,
        db=verify_db,
    )

    delete_db = _FakeDeleteDb()

    async def _users_audit_record(*_args, **_kwargs):
        return None if otp_record.consumed_at is not None else otp_record

    async def _request_deletion(**_kwargs):
        raise AssertionError("inline OTP replay must not reach deletion service")

    monkeypatch.setattr(users_endpoints, "get_latest_active_otp", _users_audit_record)
    monkeypatch.setattr(users_endpoints.deletion_svc, "request_deletion", _request_deletion)

    with pytest.raises(HTTPException) as exc_info:
        await users_endpoints.soft_delete_account(
            body=users_endpoints.DeleteAccountBody(
                confirmation_email="delete@example.com",
                otp_code="123456",
            ),
            request=_request(),
            credentials=None,
            current_user=user,
            db=delete_db,
            redis=redis,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail["code"] == "OTP_INVALID"
    assert verify_db.commits == 1
    assert delete_db.commits == 0


@pytest.mark.asyncio
async def test_delete_account_consumes_verified_marker(monkeypatch):
    user = _delete_user()
    db = _FakeDeleteDb()
    redis = _FakeRedis()
    verified_key = "auth:otp:delete_account_verified:delete@example.com"
    redis.values[verified_key] = "1"
    deletion_calls = 0

    async def _request_deletion(**kwargs):
        nonlocal deletion_calls
        deletion_calls += 1
        assert kwargs["user"] is user
        assert kwargs["otp_verified"] is True
        user.purge_at = None
        return user

    async def _audit(**_kwargs):
        return None

    async def _enqueue(**_kwargs):
        return SimpleNamespace(id=uuid.uuid4())

    async def _emit(_notification):
        return None

    monkeypatch.setattr(users_endpoints.deletion_svc, "request_deletion", _request_deletion)
    monkeypatch.setattr(users_endpoints, "audit", _audit)
    monkeypatch.setattr("app.services.notifications.enqueue", _enqueue)
    monkeypatch.setattr("app.services.notifications.emit_notification_created", _emit)

    response = await users_endpoints.soft_delete_account(
        body=users_endpoints.DeleteAccountBody(confirmation_email="delete@example.com"),
        request=_request(),
        credentials=None,
        current_user=user,
        db=db,
        redis=redis,
    )

    assert response["data"]["status"] == "pending_deletion"
    assert verified_key not in redis.values
    assert db.commits == 1
    assert deletion_calls == 1

    with pytest.raises(HTTPException) as exc_info:
        await users_endpoints.soft_delete_account(
            body=users_endpoints.DeleteAccountBody(confirmation_email="delete@example.com"),
            request=_request(),
            credentials=None,
            current_user=user,
            db=db,
            redis=redis,
        )
    assert exc_info.value.status_code == 422
    assert exc_info.value.detail["code"] == "OTP_REQUIRED"
    assert deletion_calls == 1


@pytest.mark.asyncio
async def test_delete_account_inline_wrong_otp_persists_attempt_decrement(monkeypatch):
    user = _delete_user()
    db = _FakeDeleteDb()
    redis = _FakeRedis()
    otp_record = _FakeOtpRecord()

    async def _audit_record(*_args, **_kwargs):
        return otp_record

    monkeypatch.setattr(users_endpoints, "get_latest_active_otp", _audit_record)

    with pytest.raises(HTTPException) as exc_info:
        await users_endpoints.soft_delete_account(
            body=users_endpoints.DeleteAccountBody(
                confirmation_email="delete@example.com",
                otp_code="000000",
            ),
            request=_request(),
            credentials=None,
            current_user=user,
            db=db,
            redis=redis,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail["code"] == "OTP_INVALID"
    assert otp_record.attempts_left == 4
    assert db.commits == 1


def test_delete_account_otp_openapi_enums_align():
    app.openapi_schema = None
    schema = app.openapi()
    components = schema["components"]["schemas"]

    assert "delete_account" in components["RequestOtpBody"]["properties"]["purpose"]["enum"]
    assert "delete_account" in components["VerifyOtpBody"]["properties"]["purpose"]["enum"]

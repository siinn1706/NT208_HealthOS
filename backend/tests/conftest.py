"""Root test fixtures — real DB, real JWT, SAVEPOINT-isolated sessions.

Existing tests use per-test `app.dependency_overrides[get_current_user]` with fake
User objects. This conftest does NOT install a global override so those tests are
unaffected. The client_a/b/c fixtures install+restore the override themselves.
"""
from __future__ import annotations

import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.core import Base, OnboardingStatusEnum, User


# ── Celery eager mode — run tasks in-process so no broker required ─────────────
def pytest_configure(config):
    try:
        from celery import current_app as _celery
        _celery.conf.update(task_always_eager=True, task_eager_propagates=True)
    except Exception:
        pass


# ── Session-scoped async engine ───────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


# ── Function-scoped DB session with SAVEPOINT rollback ────────────────────────
@pytest_asyncio.fixture()
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        await session.begin_nested()
        yield session
        await session.rollback()


# ── User factory ──────────────────────────────────────────────────────────────

def make_user(suffix: str | None = None) -> User:
    """Create a transient User with all NOT NULL fields. Caller must add+flush to DB."""
    tag = suffix or str(uuid.uuid4())[:8]
    user = User()
    user.id = uuid.uuid4()
    user.email = f"testuser-{tag}@idor-test.local"
    user.username = f"tester_{tag}"
    user.display_name = f"Tester {tag}"
    user.hashed_password = hash_password("TestPass123!")
    user.has_password = True
    user.onboarding_status = OnboardingStatusEnum.COMPLETED.value
    user.failed_login_attempts = 0
    user.mfa_enabled = False
    user.is_system = False
    user.deleted_at = None
    user.purge_at = None
    user.tokens_invalidated_at = None
    return user


@pytest_asyncio.fixture()
async def user_a(db: AsyncSession) -> User:
    user = make_user("a")
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture()
async def user_b(db: AsyncSession) -> User:
    user = make_user("b")
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture()
async def user_c(db: AsyncSession) -> User:
    user = make_user("c")
    db.add(user)
    await db.flush()
    return user


# ── Fake Redis ────────────────────────────────────────────────────────────────

class _FakeRedis:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value, *, nx: bool = False, ex: int | None = None):
        if nx and key in self._store:
            return None
        self._store[key] = value
        return True

    async def delete(self, key: str) -> int:
        return 1 if self._store.pop(key, None) is not None else 0

    async def incr(self, key: str) -> int:
        cur = int(self._store.get(key, "0")) + 1
        self._store[key] = str(cur)
        return cur

    async def expire(self, _key: str, _seconds: int) -> bool:
        return True

    async def ttl(self, _key: str) -> int:
        return -1

    async def exists(self, *keys: str) -> int:
        return sum(1 for k in keys if k in self._store)

    async def setex(self, key: str, ttl: int, value: str) -> bool:
        self._store[key] = value
        return True

    async def ping(self) -> bool:
        return True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _restore_override(dep, previous_value):
    if previous_value is None:
        app.dependency_overrides.pop(dep, None)
    else:
        app.dependency_overrides[dep] = previous_value


def _make_async_client(user: User) -> AsyncClient:
    token = create_access_token(user.id)
    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    )


# ── Authed HTTP clients ────────────────────────────────────────────────────────

@pytest_asyncio.fixture()
async def client_a(user_a: User) -> AsyncGenerator[AsyncClient, None]:
    from app.core.security import get_current_user
    from app.adapters.redis_client import get_redis

    prev = app.dependency_overrides.get(get_current_user)
    fake_redis = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake_redis
    _u = user_a
    app.dependency_overrides[get_current_user] = lambda: _u
    async with _make_async_client(user_a) as client:
        yield client
    _restore_override(get_current_user, prev)
    app.dependency_overrides.pop(get_redis, None)


@pytest_asyncio.fixture()
async def client_b(user_b: User) -> AsyncGenerator[AsyncClient, None]:
    from app.core.security import get_current_user
    from app.adapters.redis_client import get_redis

    prev = app.dependency_overrides.get(get_current_user)
    fake_redis = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake_redis
    _u = user_b
    app.dependency_overrides[get_current_user] = lambda: _u
    async with _make_async_client(user_b) as client:
        yield client
    _restore_override(get_current_user, prev)
    app.dependency_overrides.pop(get_redis, None)


@pytest_asyncio.fixture()
async def client_c(user_c: User) -> AsyncGenerator[AsyncClient, None]:
    from app.core.security import get_current_user
    from app.adapters.redis_client import get_redis

    prev = app.dependency_overrides.get(get_current_user)
    fake_redis = _FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake_redis
    _u = user_c
    app.dependency_overrides[get_current_user] = lambda: _u
    async with _make_async_client(user_c) as client:
        yield client
    _restore_override(get_current_user, prev)
    app.dependency_overrides.pop(get_redis, None)

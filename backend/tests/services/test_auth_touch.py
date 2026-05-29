from __future__ import annotations

import uuid

import pytest

from app.services import auth_touch


class _FakeRedis:
    def __init__(self, result=True, *, raises: bool = False):
        self.result = result
        self.raises = raises
        self.calls = []

    async def set(self, key: str, value: str, *, ex=None, nx=False):
        self.calls.append((key, value, ex, nx))
        if self.raises:
            raise RuntimeError("redis unavailable")
        return self.result


class _FakeBackgroundTasks:
    def __init__(self):
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))


@pytest.mark.asyncio
async def test_schedule_user_last_seen_touch_enqueues_when_throttle_key_is_created():
    user_id = uuid.uuid4()
    redis = _FakeRedis(result=True)
    background_tasks = _FakeBackgroundTasks()

    await auth_touch.schedule_user_last_seen_touch(user_id, redis, background_tasks)

    assert redis.calls == [
        (f"{auth_touch.LAST_SEEN_TOUCH_KEY_PREFIX}{user_id}", "1", 60, True),
    ]
    assert background_tasks.calls == [
        (auth_touch.touch_user_last_seen, (user_id,), {}),
    ]


@pytest.mark.asyncio
async def test_schedule_user_last_seen_touch_skips_when_throttled():
    user_id = uuid.uuid4()
    redis = _FakeRedis(result=None)
    background_tasks = _FakeBackgroundTasks()

    await auth_touch.schedule_user_last_seen_touch(user_id, redis, background_tasks)

    assert redis.calls == [
        (f"{auth_touch.LAST_SEEN_TOUCH_KEY_PREFIX}{user_id}", "1", 60, True),
    ]
    assert background_tasks.calls == []


@pytest.mark.asyncio
async def test_schedule_user_last_seen_touch_ignores_redis_failures():
    user_id = uuid.uuid4()
    redis = _FakeRedis(raises=True)
    background_tasks = _FakeBackgroundTasks()

    await auth_touch.schedule_user_last_seen_touch(user_id, redis, background_tasks)

    assert background_tasks.calls == []

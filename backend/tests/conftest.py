"""Top-level conftest for backend tests.

Provides log_capture fixture — a MemoryHandler on healthos.events so tests
can assert structured event emission without depending on real I/O.
"""
from __future__ import annotations

import logging
import logging.handlers
import uuid

import pytest


def make_user(label: str):
    """Build a persistable ``User`` with a unique identity derived from ``label``.

    For integration tests (e.g. the WS authz suite) that commit real rows and
    therefore need the NOT NULL / UNIQUE columns (email, username) populated.
    Columns with model/server defaults (onboarding_status, created_at, flags)
    are left unset so the DB fills them in.
    """
    from app.core.security import hash_password
    from app.models.core import User

    suffix = uuid.uuid4().hex[:10]
    user = User()
    user.id = uuid.uuid4()
    user.email = f"{label}-{suffix}@example.test"
    user.username = f"{label}-{suffix}"
    user.display_name = label
    user.hashed_password = hash_password("Test-Password-123!")
    return user


@pytest.fixture
def log_capture():
    """Attach a MemoryHandler to healthos.events; yield it; detach after test."""
    mem = logging.handlers.MemoryHandler(capacity=100, flushLevel=100)
    logger = logging.getLogger("healthos.events")
    logger.addHandler(mem)
    logger.setLevel(logging.DEBUG)
    yield mem
    logger.removeHandler(mem)
    mem.close()

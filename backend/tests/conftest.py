"""Top-level conftest for backend tests.

Provides log_capture fixture — a MemoryHandler on healthos.events so tests
can assert structured event emission without depending on real I/O.
"""
from __future__ import annotations

import logging
import logging.handlers

import pytest


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

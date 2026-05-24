"""conftest for backend/tests/e2e — registers custom pytest marks."""
import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "e2e_external: marks tests that require external services "
        "(real DB, Redis, MinIO, Celery). Skipped by default; set E2E_EXTERNAL=1 to run.",
    )

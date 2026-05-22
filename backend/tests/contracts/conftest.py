"""Shared fixtures for contract tests."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
import yaml

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND_ROOT = _REPO_ROOT / "backend"

CONTRACT_PATH = _REPO_ROOT / "contracts" / "openapi" / "core-api.yaml"
LIVE_DUMP_PATH = _REPO_ROOT / "contracts" / "openapi" / "_generated" / "core-api.live.yaml"


@pytest.fixture(scope="session")
def committed_contract() -> dict:
    """Load the committed OpenAPI contract."""
    with open(CONTRACT_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


@pytest.fixture(scope="session")
def live_schema() -> dict:
    """Generate live OpenAPI schema by calling app.openapi() directly (no DB)."""
    if str(_BACKEND_ROOT) not in sys.path:
        sys.path.insert(0, str(_BACKEND_ROOT))

    # Guard against accidental lifespan / DB connection.
    os.environ.setdefault("OPENAPI_DUMP_NO_DB", "1")

    from scripts.dump_openapi import build_schema  # noqa: WPS433
    return build_schema()

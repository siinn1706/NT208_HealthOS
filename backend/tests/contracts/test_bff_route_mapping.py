"""Test B — BFF route handlers must only call Core paths declared in contract.

Scans all ``frontend/src/app/api/v1/**/route.ts`` files via ts-morph AST and
cross-references extracted Core paths against ``contracts/openapi/core-api.yaml``.

Covers ALL BFF call patterns:
- ``coreProxy(req, "/v1/...")``
- ``coreProxy(req, f"/v1/...{id}...")`` template literals
- ``coreFetchStream(req, ...)``
- ``forwardToCore(req, ...)``
- ``fetch(CORE_API_URL + "/v1/...")``

Unparseable call sites (null corePath) are treated as test errors.
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from .device_scope import is_device_path, is_pending_stub_path
from .route_extractor import extract_routes

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BFF_DIR = _REPO_ROOT / "frontend" / "src" / "app" / "api" / "v1"
_CONTRACT_PATH = _REPO_ROOT / "contracts" / "openapi" / "core-api.yaml"


def _load_contract_paths() -> set[str]:
    with open(_CONTRACT_PATH, encoding="utf-8") as f:
        schema = yaml.safe_load(f) or {}
    return set(schema.get("paths", {}).keys())


def _normalise_path(path: str) -> str:
    """Normalise a path for contract lookup.

    BFF uses Next.js dynamic segments like ``{id}``; contract uses OpenAPI
    form like ``{appointment_id}``. We compare by segment count and static
    prefix matching.
    """
    import re
    # Replace any {whatever} with a canonical placeholder for comparison.
    return re.sub(r"\{[^}]+\}", "{id}", path)


def _path_matches_contract(path: str, contract_paths: set[str]) -> bool:
    """Check if a BFF Core path matches any contract path.

    Exact match OR segment-count + static-prefix match (handles param name
    differences between BFF and contract).
    """
    if path in contract_paths:
        return True
    norm_bff = _normalise_path(path)
    for contract_path in contract_paths:
        if _normalise_path(contract_path) == norm_bff:
            return True
    return False


def test_bff_route_mapping() -> None:
    """All BFF Core call sites must reference paths declared in the contract."""
    contract_paths = _load_contract_paths()
    call_sites = extract_routes(_BFF_DIR, mode="bff")

    errors: list[str] = []
    null_paths: list[str] = []
    stub_paths: list[str] = []

    for site in call_sites:
        core_path = site["corePath"]
        if core_path is None:
            null_paths.append(
                f"{site['file']}:{site['line']} [{site['callPattern']}] — path unresolvable"
            )
            continue

        # Skip device-scope paths (frozen).
        if is_device_path(core_path):
            continue

        # Known pending stubs — Core not yet implemented; warn, don't fail.
        if is_pending_stub_path(core_path):
            stub_paths.append(
                f"{site['file']}:{site['line']} [{site['callPattern']}] "
                f"calls pending stub `{core_path}` (not yet in Core)"
            )
            continue

        if not _path_matches_contract(core_path, contract_paths):
            errors.append(
                f"{site['file']}:{site['line']} [{site['callPattern']}] "
                f"calls Core path `{core_path}` not in contract"
            )

    messages: list[str] = []
    if stub_paths:
        # Warn only — stubs are expected until Core ships these endpoints.
        print(
            f"\n[WARN] {len(stub_paths)} BFF stub route(s) calling pending Core path(s):\n"
            + "\n".join(f"  {e}" for e in stub_paths)
            + "\n  → Remove from PENDING_STUB_BFF_PATHS once Core endpoint is implemented."
        )
    if null_paths:
        messages.append(
            f"{len(null_paths)} unresolvable BFF Core call site(s) (extractor errors):\n"
            + "\n".join(f"  {e}" for e in null_paths)
        )
    if errors:
        messages.append(
            f"{len(errors)} BFF route(s) call undeclared Core path(s):\n"
            + "\n".join(f"  {e}" for e in errors)
        )

    if messages:
        pytest.fail("\n\n".join(messages))

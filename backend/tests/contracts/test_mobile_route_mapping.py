"""Test C — Mobile call sites must only call Core paths declared in contract.

Scans all ``mobile/src/api/**/*.ts`` files via ts-morph AST and
cross-references extracted Core paths against ``contracts/openapi/core-api.yaml``.

Mobile uses BFF for REST. WebSocket connects to the public gateway
(``EXPO_PUBLIC_WS_URL``), authenticating with a first-frame ticket from
BFF ``GET /api/v1/auth/ws-token``. REST call sites still reference Core
contract paths so the drift gate can verify payload compatibility.
Pattern: ``apiRequest(path, opts?)`` where ``path`` is arg 0.

Unparseable call sites (null corePath) are treated as test errors.
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from .route_extractor import extract_routes

_REPO_ROOT = Path(__file__).resolve().parents[3]
_MOBILE_DIR = _REPO_ROOT / "mobile" / "src" / "api"
_CONTRACT_PATH = _REPO_ROOT / "contracts" / "openapi" / "core-api.yaml"


def _load_contract_paths() -> set[str]:
    with open(_CONTRACT_PATH, encoding="utf-8") as f:
        schema = yaml.safe_load(f) or {}
    return set(schema.get("paths", {}).keys())


def _normalise_path(path: str) -> str:
    import re
    return re.sub(r"\{[^}]+\}", "{id}", path)


def _path_matches_contract(path: str, contract_paths: set[str]) -> bool:
    if path in contract_paths:
        return True
    norm_mobile = _normalise_path(path)
    for contract_path in contract_paths:
        if _normalise_path(contract_path) == norm_mobile:
            return True
    return False


def test_mobile_route_mapping() -> None:
    """All mobile Core call sites must reference paths declared in the contract."""
    contract_paths = _load_contract_paths()
    call_sites = extract_routes(_MOBILE_DIR, mode="mobile")

    errors: list[str] = []
    null_paths: list[str] = []

    for site in call_sites:
        core_path = site["corePath"]
        if core_path is None:
            null_paths.append(
                f"{site['file']}:{site['line']} [{site['callPattern']}] — path unresolvable"
            )
            continue

        if not _path_matches_contract(core_path, contract_paths):
            errors.append(
                f"{site['file']}:{site['line']} [{site['callPattern']}] "
                f"calls Core path `{core_path}` not in contract"
            )

    messages: list[str] = []
    if null_paths:
        messages.append(
            f"{len(null_paths)} unresolvable mobile Core call site(s) (extractor errors):\n"
            + "\n".join(f"  {e}" for e in null_paths)
        )
    if errors:
        messages.append(
            f"{len(errors)} mobile route(s) call undeclared Core path(s):\n"
            + "\n".join(f"  {e}" for e in errors)
        )

    if messages:
        pytest.fail("\n\n".join(messages))

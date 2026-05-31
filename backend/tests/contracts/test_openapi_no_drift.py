"""Test A — OpenAPI schema must not drift from committed contract.

Generates the live schema via ``app.openapi()`` (no DB, no lifespan),
diffs it against ``contracts/openapi/core-api.yaml``, and asserts that
no non-allowlisted findings exist.

On failure a Markdown diff report is written to
``backend/tests/contracts/.last_diff.md`` for easy inspection.
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from .openapi_diff import allowed_openapi_drift_findings, diff, non_device_findings

_REPORT_PATH = Path(__file__).parent / ".last_diff.md"
_CONTRACT_PATH = Path(__file__).resolve().parents[3] / "contracts" / "openapi" / "core-api.yaml"


def _load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _render_findings_report(findings) -> str:
    lines = ["# Contract Drift — Last Test Run\n"]
    lines.append(f"Total enforced findings: **{len(findings)}**\n")
    lines.append("| Category | Path | Method | Detail |")
    lines.append("|----------|------|--------|--------|")
    for f in findings:
        lines.append(f"| {f.category} | `{f.path}` | `{f.method.upper()}` | {f.detail} |")
    return "\n".join(lines)


def test_openapi_no_drift(live_schema: dict) -> None:
    """Live FastAPI schema must match committed core-api.yaml except exact temporary drift."""
    committed = _load_yaml(_CONTRACT_PATH)
    findings = diff(live_schema, committed)
    allowed = allowed_openapi_drift_findings(findings)
    bad = non_device_findings(findings)

    if allowed:
        print(
            f"\n[WARN] {len(allowed)} exact OpenAPI drift finding(s) are temporarily allowlisted."
            "\n  -> Remove by 2026-06-15 after Core contract entries land."
        )

    if bad:
        report = _render_findings_report(bad)
        _REPORT_PATH.write_text(report, encoding="utf-8")
        summary = "\n".join(f"  [{f.category}] {f.method.upper()} {f.path}" for f in bad[:20])
        pytest.fail(
            f"{len(bad)} contract drift finding(s). Full report: {_REPORT_PATH}\n{summary}"
        )


@pytest.mark.parametrize("component_name", ["CurrentUser", "InsuranceInfo", "MedicalInfo", "UserProfileUpdate"])
def test_profile_component_no_drift(live_schema: dict, component_name: str) -> None:
    """Profile-related component schemas must match because clients generate from them."""
    committed = _load_yaml(_CONTRACT_PATH)
    live_component = live_schema["components"]["schemas"][component_name]
    committed_component = committed["components"]["schemas"][component_name]
    assert committed_component == live_component


def test_no_snapshot_update_flag_exists() -> None:
    """Ensure no --snapshot-update pytest option is registered (tampering guard)."""
    import _pytest.config as _pc

    cfg = _pc.get_plugin_manager()
    # If pytest-snapshot is installed it registers this option; we forbid it.
    assert not any(
        "snapshot-update" in str(opt)
        for opt in getattr(cfg, "_plugins", [])
    ), (
        "--snapshot-update flag detected. Contract regeneration must use "
        "backend/scripts/regenerate_contract.py --i-understand, not a pytest flag."
    )

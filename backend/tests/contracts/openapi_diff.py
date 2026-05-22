"""Canonical OpenAPI diff function — shared by diff script and contract tests.

Compares two OpenAPI dicts path-by-path and emits Finding tuples.
Device-scope findings are categorised separately; non-device findings
are what the drift gate enforces.

Import as::

    from backend.tests.contracts.openapi_diff import diff, Finding
"""
from __future__ import annotations

from typing import NamedTuple

from .device_scope import CANONICAL_ERROR_CODES, is_device_path

HTTP_METHODS = frozenset({"get", "put", "post", "delete", "options", "head", "patch", "trace"})


class Finding(NamedTuple):
    category: str   # missing-in-contract | missing-in-runtime | shape-mismatch | device-scope
    path: str
    method: str
    detail: str
    area: str


def _tag_for_path(path: str) -> str:
    segments = path.strip("/").split("/")
    if len(segments) >= 2 and segments[0] == "v1":
        area = segments[1]
        return {"public": "emergency"}.get(area, area)
    return "misc"


def _sort_recursive(node):
    if isinstance(node, dict):
        return {k: _sort_recursive(node[k]) for k in sorted(node.keys())}
    if isinstance(node, list):
        return [_sort_recursive(i) for i in node]
    return node


def _summarise_response_diff(live: dict, committed: dict) -> str:
    live_codes = set(live.keys())
    committed_codes = set(committed.keys())
    missing = live_codes - committed_codes
    extra = committed_codes - live_codes
    parts: list[str] = []
    if missing:
        parts.append(f"live-only status codes {sorted(missing)}")
    if extra:
        parts.append(f"contract-only status codes {sorted(extra)}")
    if not parts:
        parts.append("schema content differs")
    return "; ".join(parts)


def _compare_operation(
    path: str,
    method: str,
    live_op: dict | None,
    committed_op: dict | None,
) -> list[Finding]:
    findings: list[Finding] = []
    area = _tag_for_path(path)
    device = is_device_path(path)

    if live_op is None and committed_op is not None:
        cat = "device-scope" if device else "missing-in-runtime"
        findings.append(Finding(cat, path, method, "Present in contract, absent in runtime", area))
        return findings

    if live_op is not None and committed_op is None:
        cat = "device-scope" if device else "missing-in-contract"
        findings.append(Finding(cat, path, method, "Present in runtime, absent in contract", area))
        return findings

    if live_op is None and committed_op is None:
        return findings

    assert live_op is not None and committed_op is not None

    # Compare responses — exclude canonical error codes (intentionally added to contract).
    live_resp: dict = _sort_recursive(live_op.get("responses") or {})
    committed_resp: dict = _sort_recursive(committed_op.get("responses") or {})
    live_resp_cmp = {k: v for k, v in live_resp.items() if k not in CANONICAL_ERROR_CODES}
    committed_resp_cmp = {k: v for k, v in committed_resp.items() if k not in CANONICAL_ERROR_CODES}

    if live_resp_cmp != committed_resp_cmp:
        cat = "device-scope" if device else "shape-mismatch"
        findings.append(
            Finding(
                cat, path, method,
                f"Response shape differs: {_summarise_response_diff(live_resp_cmp, committed_resp_cmp)}",
                area,
            )
        )

    # Compare request body.
    live_body = _sort_recursive(live_op.get("requestBody") or {})
    committed_body = _sort_recursive(committed_op.get("requestBody") or {})
    if live_body != committed_body and (live_body or committed_body):
        cat = "device-scope" if device else "shape-mismatch"
        findings.append(Finding(cat, path, method, "Request body differs", area))

    return findings


def diff(live_schema: dict, committed_schema: dict) -> list[Finding]:
    """Return list of Findings between live and committed OpenAPI schemas."""
    live_paths: dict = live_schema.get("paths") or {}
    committed_paths: dict = committed_schema.get("paths") or {}

    findings: list[Finding] = []
    for path in sorted(set(live_paths) | set(committed_paths)):
        live_methods = {
            k.lower(): v
            for k, v in (live_paths.get(path) or {}).items()
            if k.lower() in HTTP_METHODS
        }
        committed_methods = {
            k.lower(): v
            for k, v in (committed_paths.get(path) or {}).items()
            if k.lower() in HTTP_METHODS
        }
        for method in sorted(set(live_methods) | set(committed_methods)):
            findings.extend(
                _compare_operation(path, method, live_methods.get(method), committed_methods.get(method))
            )
    return findings


def non_device_findings(findings: list[Finding]) -> list[Finding]:
    return [f for f in findings if f.category != "device-scope"]

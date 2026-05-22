"""Parse Phase 1 IDOR audit matrix markdown files into test parameters."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

_PLAN_DIR = Path(__file__).parents[3] / "plans" / "260522-1931-backend-authz-idor-audit"


@dataclass
class RestMatrixRow:
    module: str
    method: str
    path: str
    owner_mechanism: str
    fail_status: int
    notes: str

    @property
    def has_path_id(self) -> bool:
        return "{" in self.path

    @property
    def is_public(self) -> bool:
        return "N/A-public" in self.owner_mechanism or "N/A-no-resource-id" in self.owner_mechanism


@dataclass
class WsMatrixRow:
    event: str
    member_check: str
    owner_mechanism: str
    notes: str

    @property
    def requires_membership(self) -> bool:
        return "N/A-no-resource-id" not in self.owner_mechanism and "N/A" not in self.owner_mechanism


def load_rest_matrix(path: Path | None = None) -> list[RestMatrixRow]:
    """Parse REST audit matrix; return rows that have a resource ID path param."""
    src = path or (_PLAN_DIR / "idor-audit-matrix.md")
    rows: list[RestMatrixRow] = []
    for line in src.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or line.startswith("| Module") or line.startswith("|---"):
            continue
        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 8:
            continue
        module, verb, path, _svc, owner, fail_status_raw, _audited, notes = parts[:8]
        try:
            fail_status = int(re.search(r"\d{3}", fail_status_raw).group())
        except (AttributeError, ValueError):
            fail_status = 404
        rows.append(RestMatrixRow(
            module=module.strip(),
            method=verb.strip().upper(),
            path=path.strip(),
            owner_mechanism=owner.strip(),
            fail_status=fail_status,
            notes=notes.strip(),
        ))
    return rows


def load_ws_matrix(path: Path | None = None) -> list[WsMatrixRow]:
    """Parse WS audit matrix."""
    src = path or (_PLAN_DIR / "idor-audit-ws.md")
    rows: list[WsMatrixRow] = []
    for line in src.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or line.startswith("| Event") or line.startswith("|---"):
            continue
        parts = [p.strip() for p in line.strip("|").split("|")]
        if len(parts) < 6:
            continue
        event, _svc, member_check, _room, owner, notes = parts[:6]
        rows.append(WsMatrixRow(
            event=event.strip(),
            member_check=member_check.strip(),
            owner_mechanism=owner.strip(),
            notes=notes.strip(),
        ))
    return rows

"""Python wrapper around the ts-morph Node.js route extractor.

Invokes ``extract-routes.mjs`` as a subprocess and returns parsed results.
Raises on non-zero exit or unparseable JSON.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import TypedDict

_EXTRACTOR_DIR = Path(__file__).parent / "extractor"
_EXTRACTOR_SCRIPT = _EXTRACTOR_DIR / "extract-routes.mjs"


class RouteCallSite(TypedDict):
    file: str
    line: int
    callPattern: str
    corePath: str | None


def extract_routes(target_dir: Path, mode: str = "bff") -> list[RouteCallSite]:
    """Run the ts-morph extractor and return parsed call-site list.

    Args:
        target_dir: Directory to scan (BFF routes or mobile services).
        mode: ``"bff"`` or ``"mobile"``.

    Raises:
        RuntimeError: extractor process failed.
        ValueError: extractor returned invalid JSON.
    """
    if not _EXTRACTOR_SCRIPT.exists():
        raise RuntimeError(
            f"Extractor script not found: {_EXTRACTOR_SCRIPT}. "
            "Run: cd backend/tests/contracts/extractor && npm install"
        )

    result = subprocess.run(
        ["node", str(_EXTRACTOR_SCRIPT), "--dir", str(target_dir), "--mode", mode],
        capture_output=True,
        text=True,
        cwd=str(_EXTRACTOR_DIR),
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Route extractor failed (exit {result.returncode}):\n{result.stderr}"
        )

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Route extractor returned invalid JSON: {exc}\nstdout: {result.stdout[:500]}"
        ) from exc

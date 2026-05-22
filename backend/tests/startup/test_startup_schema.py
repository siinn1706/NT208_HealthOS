"""Startup schema verification regressions for auth-critical migrations."""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

from app.core.startup_schema import (
    evaluate_schema_snapshot,
    raise_for_auth_critical_schema,
)


def _read_literal_assignment(module: ast.Module, name: str):
    for node in module.body:
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == name:
            return ast.literal_eval(node.value)
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
    raise AssertionError(f"Could not find `{name}` assignment")


def _alembic_heads(versions_dir: Path) -> set[str]:
    revisions: set[str] = set()
    down_revisions: set[str] = set()

    for path in versions_dir.glob("*.py"):
        module = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        revision = _read_literal_assignment(module, "revision")
        down_revision = _read_literal_assignment(module, "down_revision")

        revisions.add(revision)
        if isinstance(down_revision, tuple):
            down_revisions.update(item for item in down_revision if item is not None)
        elif down_revision is not None:
            down_revisions.add(down_revision)

    return revisions - down_revisions


def test_auth_critical_schema_missing_raises_clear_startup_error():
    result = evaluate_schema_snapshot(
        tables={"users", "messages"},
        columns={
            "users": {"is_system"},
            "messages": {"ai_metadata"},
        },
    )

    assert "users.has_password (migration 023)" in result.auth_missing
    assert "users.tokens_invalidated_at (migration 023)" in result.auth_missing
    assert "oauth_accounts table (migration 016)" in result.auth_missing

    with pytest.raises(RuntimeError, match="Run `alembic upgrade head`"):
        raise_for_auth_critical_schema(result)


def test_optional_ai_schema_can_degrade_without_blocking_auth_validation():
    result = evaluate_schema_snapshot(
        tables={"users", "messages", "oauth_accounts", "refresh_token_sessions"},
        columns={
            "users": {"is_system", "has_password", "tokens_invalidated_at"},
            "messages": set(),
        },
    )

    assert result.auth_missing == ()
    assert result.optional_missing == ("messages.ai_metadata (migration 015)",)

    raise_for_auth_critical_schema(result)


def test_alembic_repository_has_a_single_canonical_head():
    versions_dir = Path(__file__).resolve().parents[2] / "alembic" / "versions"

    assert _alembic_heads(versions_dir) == {"030_add_refresh_token_sessions"}

"""Startup schema verification helpers for auth-critical migrations."""
from __future__ import annotations

import logging
from collections.abc import Mapping, Set as AbstractSet
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI
    from sqlalchemy.ext.asyncio import AsyncEngine

_startup_logger = logging.getLogger("healthos")

_AUTH_CRITICAL_TABLES = {
    "oauth_accounts": "oauth_accounts table (migration 016)",
    "refresh_token_sessions": "refresh_token_sessions table (migration 030)",
}

_AUTH_CRITICAL_COLUMNS = {
    "users": {
        "is_system": "users.is_system (migration 014)",
        "has_password": "users.has_password (migration 023)",
        "tokens_invalidated_at": "users.tokens_invalidated_at (migration 023)",
    }
}

_OPTIONAL_COLUMNS = {
    "messages": {
        "ai_metadata": "messages.ai_metadata (migration 015)",
    }
}


@dataclass(frozen=True)
class SchemaVerificationResult:
    auth_missing: tuple[str, ...]
    optional_missing: tuple[str, ...]
    ai_metadata_available: bool
    users_is_system_available: bool


def evaluate_schema_snapshot(
    *,
    tables: AbstractSet[str],
    columns: Mapping[str, AbstractSet[str]],
) -> SchemaVerificationResult:
    auth_missing: list[str] = []
    optional_missing: list[str] = []

    for table_name, description in _AUTH_CRITICAL_TABLES.items():
        if table_name not in tables:
            auth_missing.append(description)

    for table_name, required_columns in _AUTH_CRITICAL_COLUMNS.items():
        existing_columns = columns.get(table_name, set())
        for column_name, description in required_columns.items():
            if column_name not in existing_columns:
                auth_missing.append(description)

    for table_name, optional_columns in _OPTIONAL_COLUMNS.items():
        existing_columns = columns.get(table_name, set())
        for column_name, description in optional_columns.items():
            if column_name not in existing_columns:
                optional_missing.append(description)

    users_columns = columns.get("users", set())
    messages_columns = columns.get("messages", set())
    return SchemaVerificationResult(
        auth_missing=tuple(auth_missing),
        optional_missing=tuple(optional_missing),
        ai_metadata_available="ai_metadata" in messages_columns,
        users_is_system_available="is_system" in users_columns,
    )


def apply_schema_flags(application: "FastAPI", result: SchemaVerificationResult) -> None:
    application.state.ai_metadata_available = result.ai_metadata_available
    application.state.users_is_system_available = result.users_is_system_available


def raise_for_auth_critical_schema(result: SchemaVerificationResult) -> None:
    if not result.auth_missing:
        return

    message = (
        "Auth-critical schema dependencies missing: "
        + ", ".join(result.auth_missing)
        + ". Run `alembic upgrade head` before serving traffic."
    )
    raise RuntimeError(message)


def warn_for_optional_schema(result: SchemaVerificationResult) -> None:
    if not result.optional_missing:
        return

    _startup_logger.warning(
        "Optional schema dependencies missing: %s. AI chat features will degrade until migrations are applied.",
        ", ".join(result.optional_missing),
    )


async def inspect_schema(engine: "AsyncEngine") -> SchemaVerificationResult:
    from sqlalchemy import text

    async with engine.connect() as conn:
        table_rows = (
            await conn.execute(
                text(
                    "SELECT table_name "
                    "FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                )
            )
        ).all()
        column_rows = (
            await conn.execute(
                text(
                    "SELECT table_name, column_name "
                    "FROM information_schema.columns "
                    "WHERE table_schema = 'public'"
                )
            )
        ).all()

    tables = {row[0] for row in table_rows}
    columns: dict[str, set[str]] = {}
    for table_name, column_name in column_rows:
        columns.setdefault(table_name, set()).add(column_name)

    return evaluate_schema_snapshot(tables=tables, columns=columns)


async def verify_startup_schema(application: "FastAPI", engine: AsyncEngine) -> SchemaVerificationResult:
    result = await inspect_schema(engine)
    apply_schema_flags(application, result)
    raise_for_auth_critical_schema(result)
    warn_for_optional_schema(result)
    return result

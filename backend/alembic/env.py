"""Alembic environment — fully async via asyncpg (same driver as the app).

Uses SQLAlchemy async engine so migrations run with the exact same credentials
and driver as the production code.  No psycopg2 required.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# ── Import all models so autogenerate can see them ──────────────────────────
from app.core.config import settings
from app.models.core import Base  # noqa: F401 — registers all ORM metadata

# ── Alembic Config object ────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    """Return the asyncpg DATABASE_URL; ALEMBIC_DATABASE_URL overrides."""
    url = os.environ.get("ALEMBIC_DATABASE_URL", settings.database_url)
    # ensure we always use the asyncpg driver
    if url.startswith("postgresql://") or url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    return url


# ── Offline mode ──────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Emit raw SQL without a live connection."""
    context.configure(
        url=_get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        # Mirror the online-mode widening so any DBA pasting the generated
        # SQL into a fresh database also gets the wider ``version_num`` column.
        context.execute(
            f"CREATE TABLE IF NOT EXISTS alembic_version ("
            f"version_num VARCHAR({_VERSION_TABLE_PK_LENGTH}) NOT NULL, "
            f"CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
        )
        context.execute(
            f"ALTER TABLE alembic_version "
            f"ALTER COLUMN version_num TYPE VARCHAR({_VERSION_TABLE_PK_LENGTH})"
        )
        context.run_migrations()


# ── Online mode (async) ───────────────────────────────────────────────────────

# Alembic's default ``alembic_version.version_num`` column is ``VARCHAR(32)``
# and there is no public ``configure(...)`` parameter to override it. Several
# B7 revision IDs (e.g. ``023_b7_users_has_password_and_token_invalidation``,
# 48 chars) overflow that limit and crash ``alembic upgrade`` with
# ``StringDataRightTruncationError`` *before* any DDL is applied.
#
# We widen the column to 128 chars on every migration run. The statement is
# idempotent: ``CREATE TABLE IF NOT EXISTS`` materialises the table with the
# wide column on a virgin database, and ``ALTER TABLE ... TYPE`` is a no-op
# when the column is already wide enough.
_VERSION_TABLE_PK_LENGTH = 128


def _ensure_version_table_width(connection) -> None:
    from sqlalchemy import text

    connection.execute(
        text(
            "CREATE TABLE IF NOT EXISTS alembic_version ("
            f"version_num VARCHAR({_VERSION_TABLE_PK_LENGTH}) NOT NULL, "
            "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
        )
    )
    connection.execute(
        text(
            f"ALTER TABLE alembic_version "
            f"ALTER COLUMN version_num TYPE VARCHAR({_VERSION_TABLE_PK_LENGTH})"
        )
    )


def do_run_migrations(connection):
    _ensure_version_table_width(connection)

    # SQLAlchemy 2.x autobegins a transaction the moment the connection emits
    # any statement (the ``CREATE TABLE IF NOT EXISTS`` above is enough). If
    # we hand the still-in-transaction connection to ``MigrationContext`` it
    # records ``_in_external_transaction = True`` and disables its own
    # transaction tracking, which leaves ``self._transaction = None``. That
    # later trips ``assert self._transaction is not None`` inside
    # ``autocommit_block()`` for the B7 migrations that extend Postgres enums
    # (``015_b7_appointment_status_and_ingredients``,
    # ``016_b7_oauth_accounts_and_audit_events``).
    #
    # Commit the autobegin transaction first so Alembic owns the transaction
    # lifecycle from here on out — combined with ``transaction_per_migration``
    # below, every revision gets its own real transaction that
    # ``autocommit_block()`` is free to commit/restart.
    if connection.in_transaction():
        connection.commit()

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # One transaction per migration (instead of one big transaction around
        # the whole upgrade run) is required for ``autocommit_block()`` to work.
        # Without it, autocommit_block tries to commit the outer wrapping
        # transaction while other migrations are still pending.
        #
        # Trade-off for migration authors: if migration N fails, migrations
        # 1..N-1 stay committed. Write each migration so that re-running the
        # upgrade after a failure is safe (use ``IF [NOT] EXISTS``, idempotent
        # backfills, etc.). Existing migrations already follow this rule.
        transaction_per_migration=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_get_url(), echo=False)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())

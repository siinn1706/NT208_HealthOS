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
        version_num_length=64, 
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (async) ───────────────────────────────────────────────────────

def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        version_num_length=64, 
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
"""Alembic environment — async-aware setup for SQLAlchemy 2.x + asyncpg.

The migration runner uses a *synchronous* psycopg2 connection to apply DDL,
while the application uses asyncpg at runtime.  The DATABASE_URL env var (or
default from settings) is converted automatically.
"""

import os
import re
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Import all models so autogenerate can see them ──────────────────────────
# Keep this block in sync with any new model files.
from app.core.config import settings
from app.models.core import Base  # noqa: F401 — registers all ORM metadata

# ── Alembic Config object ────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


# ── Helpers ──────────────────────────────────────────────────────────────────

def _sync_url(url: str) -> str:
    """Replace asyncpg driver with psycopg2 for Alembic's sync engine."""
    return re.sub(r"postgresql\+asyncpg", "postgresql+psycopg2", url)


def _get_url() -> str:
    # Allow override via env var for CI / Docker
    return _sync_url(
        os.environ.get("ALEMBIC_DATABASE_URL", settings.database_url)
    )


# ── Offline mode (no live DB connection) ─────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations without a DB connection — outputs SQL to stdout."""
    url = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ───────────────────────────────────────────────────────────────

def run_migrations_online() -> None:
    """Run migrations with a live DB connection."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

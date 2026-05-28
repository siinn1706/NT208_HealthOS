"""SQLAlchemy async engine and session factory."""
import logging
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
import app.models  # noqa: F401 — ensure all mappers register
from app.models import Base

logger = logging.getLogger(__name__)

_async_engine_options = {
    "echo": settings.debug,
    "pool_pre_ping": True,
    "pool_recycle": 300,
}
if settings.debug:
    _async_engine_options["poolclass"] = NullPool
else:
    _async_engine_options.update({"pool_size": 20, "max_overflow": 10})

engine = create_async_engine(settings.database_url, **_async_engine_options)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Sync engine for Celery tasks
sync_engine = create_engine(
    settings.database_url.replace("+asyncpg", ""),
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)
SyncSessionLocal = sessionmaker(bind=sync_engine)


@asynccontextmanager
async def get_db_context():
    """Async context manager for FastAPI.

    Callers MUST `await session.commit()` after mutations. Read-only callers
    leave the transaction to implicit-rollback at session close (no-op).
    Exceptions roll back automatically.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            logger.exception("Transaction rolled back")
            await session.rollback()
            raise


@contextmanager
def get_sync_db_context():
    """Sync context manager for Celery tasks.

    # NOTE: sync session keeps auto-commit-on-success for Celery — caller owns
    # full-task transactions; see plans/260522-1717-db-session-tx-safety-alembic/
    # Intentionally asymmetric with get_db / get_db_context (async FastAPI sessions).
    """
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        logger.exception("Transaction rolled back")
        session.rollback()
        raise
    finally:
        session.close()


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session.

    Callers MUST `await db.commit()` after mutations. Read-only handlers
    leave the transaction to implicit-rollback at session close (no-op).
    Exceptions roll back automatically.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            logger.exception("Transaction rolled back")
            await session.rollback()
            raise

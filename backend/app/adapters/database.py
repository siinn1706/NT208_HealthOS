"""SQLAlchemy async engine and session factory."""
import logging
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

from app.core.config import settings
from app.models.core import Base

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

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
    """Async context manager for FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            logger.exception("Transaction rolled back")
            await session.rollback()
            raise


@contextmanager
def get_sync_db_context():
    """Sync context manager for Celery tasks."""
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
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            logger.exception("Transaction rolled back")
            await session.rollback()
            raise

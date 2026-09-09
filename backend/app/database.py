"""Async SQLAlchemy database setup."""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

_IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {
    "echo": settings.DATABASE_ECHO,
    "future": True,
}
if _IS_SQLITE:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update(
        {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
        }
    )

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Backwards/legacy alias used by seed.py and some utilities.
SessionLocal = async_session_maker


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables (used for development; use Alembic in production)."""
    from app.models import Base  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def ping_database() -> bool:
    """Check whether the database is reachable."""
    try:
        from sqlalchemy import text

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
"""Importable pytest markers (kept out of conftest for clean imports)."""
from __future__ import annotations

import asyncio

import pytest

from app.config import settings


def _database_reachable() -> bool:
    """Best-effort check whether a real Postgres is answering at DATABASE_URL."""
    try:
        import asyncpg  # noqa: F401

        url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        loop = asyncio.new_event_loop()
        try:
            conn = loop.run_until_complete(asyncpg.connect(url, timeout=2))
            conn.close()
            return True
        except Exception:
            return False
        finally:
            loop.close()
    except Exception:
        return False


require_db = pytest.mark.skipif(
    not _database_reachable(),
    reason="PostgreSQL required for integration tests",
)
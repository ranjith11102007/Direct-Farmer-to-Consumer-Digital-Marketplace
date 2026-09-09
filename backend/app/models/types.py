"""Cross-dialect type shims.

The full Vakkika schema is designed for PostgreSQL. For local demo runs the
backend can fall back to SQLite. These shims map PostgreSQL-specific types to
portable equivalents so the same models work on both engines.

SQLAlchemy 2.0's generic ``Uuid`` stores values as native UUID on PostgreSQL
and as CHAR(32) on SQLite, so it works everywhere.
"""
from __future__ import annotations

from app.config import settings

IS_POSTGRES = settings.DATABASE_URL.startswith(("postgresql", "postgres", "asyncpg"))

if IS_POSTGRES:
    from app.models.types import UUID
else:
    from sqlalchemy import Uuid as UUID
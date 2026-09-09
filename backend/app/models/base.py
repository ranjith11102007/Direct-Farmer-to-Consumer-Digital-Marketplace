"""Base model with common fields and mixins."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def generate_uuid() -> uuid.UUID:
    return uuid.uuid4()


class IdMixin:
    """Adds a UUID primary key."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=generate_uuid,
        unique=True,
        index=True,
    )


class TimestampMixin:
    """Adds created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True,
    )


class BaseModel(IdMixin, TimestampMixin, Base):
    """Abstract base model with id, created_at and updated_at."""

    __abstract__ = True

    def to_dict(self) -> dict[str, Any]:
        """Serialize common attributes to a dictionary."""
        return {
            key: (value.isoformat() if isinstance(value, datetime) else value)
            for key, value in self.__dict__.items()
            if not key.startswith("_")
        }

    def __repr__(self) -> str:  # pragma: no cover - repr helper
        attrs = ", ".join(
            f"{k}={getattr(self, k)!r}"
            for k in ("id",)
            if hasattr(self, k)
        )
        return f"{self.__class__.__name__}({attrs})"
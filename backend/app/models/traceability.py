"""Traceability passport for batch QR code tracking."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class TraceabilityPassport(BaseModel):
    __tablename__ = "traceability_passports"

    batch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="CASCADE"), unique=True
    )
    qr_code_data: Mapped[str] = mapped_column(Text, unique=True, index=True)
    passport_data_json: Mapped[dict] = mapped_column(JSON, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    scan_count: Mapped[int] = mapped_column(Integer, default=0)
    last_scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    batch = relationship("Batch", back_populates="passport")

    def __repr__(self) -> str:
        return f"<TraceabilityPassport id={self.id} batch={self.batch_id} scans={self.scan_count}>"
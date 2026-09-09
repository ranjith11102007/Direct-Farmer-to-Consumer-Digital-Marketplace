"""Audit logging and consent tracking."""
from __future__ import annotations

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    ForeignKey,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(100), index=True)
    entity_type: Mapped[str] = mapped_column(String(100), index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    old_value_json: Mapped[dict | None] = mapped_column(JSON)
    new_value_json: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r} entity={self.entity_type}>"


class ConsentRecord(BaseModel):
    __tablename__ = "consent_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    consent_type: Mapped[str] = mapped_column(String(100))
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[str | None] = mapped_column(String(50))

    def __repr__(self) -> str:
        return f"<ConsentRecord id={self.id} type={self.consent_type} granted={self.granted}>"
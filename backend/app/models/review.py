"""Product reviews."""
from __future__ import annotations

import uuid

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Review(BaseModel):
    __tablename__ = "reviews"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    product_listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_listings.id", ondelete="CASCADE"),
        index=True,
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), index=True
    )
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    farmer_response: Mapped[str | None] = mapped_column(Text)
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<Review id={self.id} listing={self.product_listing_id} rating={self.rating}>"
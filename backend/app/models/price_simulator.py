"""Price simulator model comparing selling channels."""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Enum,
    Float,
    ForeignKey,
    String,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class PriceChannel(str, enum.Enum):
    LOCAL_MARKET = "local_market"
    DIRECT_MARKETPLACE = "direct_marketplace"
    BULK_CONTRACT = "bulk_contract"


class PriceSimulator(BaseModel):
    __tablename__ = "price_simulators"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    quantity: Mapped[float] = mapped_column(Float, default=1)
    channel: Mapped[PriceChannel] = mapped_column(
        Enum(PriceChannel, name="price_channel_enum", native_enum=False),
        default=PriceChannel.DIRECT_MARKETPLACE,
    )
    logistics_cost: Mapped[float] = mapped_column(Float, default=0)
    farmer_settlement: Mapped[float] = mapped_column(Float, default=0)
    consumer_price: Mapped[float] = mapped_column(Float, default=0)

    def __repr__(self) -> str:
        return f"<PriceSimulator id={self.id} channel={self.channel} settlement={self.farmer_settlement}>"
"""Fair price simulator comparing selling channels for farmers."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.product import Product, ProductListing, ListingStatus
from app.models.price_simulator import PriceChannel, PriceSimulator


@dataclass
class ChannelQuote:
    channel: PriceChannel
    name: str
    farmer_settlement_per_kg: float
    logistics_cost_per_kg: float
    consumer_price_per_kg: float
    platform_fee_per_kg: float
    total_farmer_settlement: float
    notes: list[str] = None  # type: ignore[assignment]


@dataclass
class PriceSimulationResult:
    product_id: uuid.UUID
    quantity_kg: float
    baseline_price_per_kg: float
    quotes: list[ChannelQuote]
    best_channel: ChannelQuote
    summary: str
    simulation_id: uuid.UUID | None = None


class FairPriceSimulator:
    """Compare farmer take-home across channels under clear assumptions.

    Assumptions (documented, sector-informed):
      - Local mandi: farmer gets ~55% of retail.
      - Direct marketplace: platform fee 5%, delivery passed to buyer.
      - Bulk contract: volume discount but guaranteed offtake (~8% lower price).
    """

    LOCAL_MANDI_SHARE = 0.55
    MARKETPLACE_FEE = settings.PLATFORM_FEE_PERCENT / 100.0
    BULK_DISCOUNT = 0.92
    LOCAL_LOGISTICS_PER_KG = 2.5
    MARKET_LOGISTICS_PER_KG = 1.2
    BULK_LOGISTICS_PER_KG = 0.8
    LOCAL_RETAIL_MARKUP = 1.45
    MARKETPLACE_RETAIL_MARKUP = 1.12
    BULK_RETAIL_MARKUP = 1.06
    MIN_FLOOR_PRICE_PER_KG = 5.0

    async def simulate(
        self,
        db: AsyncSession,
        *,
        product_id: uuid.UUID,
        quantity_kg: float,
        user_id: uuid.UUID | None = None,
    ) -> PriceSimulationResult:
        product = (
            await db.execute(select(Product).where(Product.id == product_id))
        ).scalar_one_or_none()
        if product is None:
            raise LookupError("Product not found.")

        baseline = await self._market_reference_price(db, product_id)
        if baseline <= self.MIN_FLOOR_PRICE_PER_KG:
            baseline = self.MIN_FLOOR_PRICE_PER_KG

        qty = max(1.0, float(quantity_kg))
        quotes = [
            self._local_market_quote(baseline, qty),
            self._marketplace_quote(baseline, qty),
            self._bulk_contract_quote(baseline, qty),
        ]

        best = max(quotes, key=lambda q: q.total_farmer_settlement)
        summary = self._build_summary(product.name, best, qty)

        result = PriceSimulationResult(
            product_id=product_id,
            quantity_kg=qty,
            baseline_price_per_kg=round(baseline, 2),
            quotes=quotes,
            best_channel=best,
            summary=summary,
        )

        if user_id is not None:
            result.simulation_id = await self._persist(db, user_id, product_id, qty, best)
        return result

    # ---------- Channel models ----------

    def _local_market_quote(self, baseline: float, qty: float) -> ChannelQuote:
        consumer_price = baseline * self.LOCAL_RETAIL_MARKUP
        farmer_share = consumer_price * self.LOCAL_MANDI_SHARE
        logistics = self.LOCAL_LOGISTICS_PER_KG
        net = max(0.0, farmer_share - logistics)
        return ChannelQuote(
            channel=PriceChannel.LOCAL_MARKET,
            name="Local market (mandi)",
            farmer_settlement_per_kg=round(farmer_share, 2),
            logistics_cost_per_kg=round(logistics, 2),
            consumer_price_per_kg=round(consumer_price, 2),
            platform_fee_per_kg=0.0,
            total_farmer_settlement=round(net * qty, 2),
            notes=["Uncertain prices", "Middlemen share captured", "No time guarantee"],
        )

    def _marketplace_quote(self, baseline: float, qty: float) -> ChannelQuote:
        platform_fee = baseline * self.MARKETPLACE_FEE
        consumer_price = baseline * self.MARKETPLACE_RETAIL_MARKUP
        logistics = self.MARKET_LOGISTICS_PER_KG
        net = baseline - platform_fee - logistics
        return ChannelQuote(
            channel=PriceChannel.DIRECT_MARKETPLACE,
            name="Vaikkal direct marketplace",
            farmer_settlement_per_kg=round(baseline, 2),
            logistics_cost_per_kg=round(logistics, 2),
            consumer_price_per_kg=round(consumer_price, 2),
            platform_fee_per_kg=round(platform_fee, 2),
            total_farmer_settlement=round(max(0.0, net) * qty, 2),
            notes=["Transparent pricing", "Predicted demand visibility"],
        )

    def _bulk_contract_quote(self, baseline: float, qty: float) -> ChannelQuote:
        contract_price = baseline * self.BULK_DISCOUNT
        platform_fee = 0.0
        consumer_price = contract_price * self.BULK_RETAIL_MARKUP
        logistics = self.BULK_LOGISTICS_PER_KG
        net = contract_price - logistics
        return ChannelQuote(
            channel=PriceChannel.BULK_CONTRACT,
            name="Bulk / institutional contract",
            farmer_settlement_per_kg=round(contract_price, 2),
            logistics_cost_per_kg=round(logistics, 2),
            consumer_price_per_kg=round(consumer_price, 2),
            platform_fee_per_kg=platform_fee,
            total_farmer_settlement=round(max(0.0, net) * qty, 2),
            notes=["Guaranteed offtake", "Fixed schedule", "Lower per-kg price"],
        )

    # ---------- Support ----------

    @staticmethod
    async def _market_reference_price(db: AsyncSession, product_id: uuid.UUID) -> float:
        listings = await db.execute(
            select(ProductListing)
            .where(
                ProductListing.product_id == product_id,
                ProductListing.status == ListingStatus.ACTIVE,
                ProductListing.available_quantity > 0,
            )
            .order_by(ProductListing.price_per_unit.asc())
        )
        rows = list(listings.scalars().unique().all())
        if not rows:
            return 45.0
        prices = [float(r.price_per_unit) for r in rows]
        mid = prices[len(prices) // 2]
        return mid if mid > 0 else 45.0

    @classmethod
    def _build_summary(cls, product_name: str, best: ChannelQuote, qty: float) -> str:
        return (
            f"For {qty:g}kg of {product_name}, the best channel is '{best.name}' "
            f"with an estimated farmer settlement of Rs. {best.total_farmer_settlement:,.2f} "
            f"({best.farmer_settlement_per_kg:,.2f}/kg)."
        )

    @staticmethod
    async def _persist(
        db: AsyncSession,
        user_id: uuid.UUID,
        product_id: uuid.UUID,
        quantity: float,
        quote: ChannelQuote,
    ) -> uuid.UUID:
        record = PriceSimulator(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
            channel=quote.channel,
            logistics_cost=quote.logistics_cost_per_kg,
            farmer_settlement=quote.farmer_settlement_per_kg,
            consumer_price=quote.consumer_price_per_kg,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record.id

    # ---------- Public helpers ----------

    @staticmethod
    async def history(db: AsyncSession, user_id: uuid.UUID) -> list[PriceSimulator]:
        result = await db.execute(
            select(PriceSimulator)
            .where(PriceSimulator.user_id == user_id)
            .order_by(PriceSimulator.created_at.desc())
        )
        return list(result.scalars().unique().all())
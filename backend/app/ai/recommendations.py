"""Product recommendation engine combining multiple signals."""
from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import CartItem, Order, OrderItem
from app.models.product import ListingStatus, Product, ProductListing
from app.models.review import Review
from app.models.subscription import Subscription


class RecommendationEngine:
    """Rank listings using location, season, history, inventory, consolidation."""

    def __init__(self, limit: int = 8) -> None:
        self.limit = limit

    async def recommend(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID | None = None,
        district: str | None = None,
        lat: float | None = None,
        lng: float | None = None,
        exclude_listing_ids: list[uuid.UUID] | None = None,
    ) -> list[dict[str, Any]]:
        listings = (
            await db.execute(
                select(ProductListing)
                .where(
                    ProductListing.status == ListingStatus.ACTIVE,
                    ProductListing.available_quantity > 0,
                )
                .order_by(ProductListing.created_at.desc())
                .limit(200)
            )
        ).scalars().unique().all()

        if not listings:
            return []

        scores: dict[uuid.UUID, float] = defaultdict(float)
        reasons: dict[uuid.UUID, list[str]] = defaultdict(list)

        product_scores = await self._product_affinity(db, user_id) if user_id else {}

        for listing in listings:
            pid = listing.product_id
            reasons_for = reasons[listing.id]

            # 1. Location proximity.
            if district and listing.location_district == district:
                scores[listing.id] += 8.0
                reasons_for.append("local_to_you")
            if lat is not None and lng is not None and listing_farmer_coord(listing) is not None:
                f_lat, f_lng = listing_farmer_coord(listing)
                distance_km = (abs(f_lat - lat) + abs(f_lng - lng)) * 111.0
                if distance_km < 30:
                    scores[listing.id] += 6.0
                    reasons_for.append("nearby_farm")

            # 2. Seasonal fit (Indian growing season).
            seasonal = self._seasonal_fit(listing)
            scores[listing.id] += seasonal * 3.0
            if seasonal > 0:
                reasons_for.append("in_season")

            # 3. Purchase history affinity.
            aff = product_scores.get(pid, 0.0)
            scores[listing.id] += aff * 4.0
            if aff > 0:
                reasons_for.append("bought_before")

            # 4. Stock & freshness boost.
            if float(listing.available_quantity) >= float(listing.min_order_quantity or 1):
                scores[listing.id] += 1.5
            if listing.expiry_date is not None and listing.harvest_date is not None:
                age_days = (listing.expiry_date - listing.harvest_date).days
                if age_days <= 5:
                    scores[listing.id] += 1.0
                    reasons_for.append("fresh_pick")

            # 5. Organic bonus.
            if listing.organic_certified:
                scores[listing.id] += 2.0
                reasons_for.append("organic")

            # 6. Review quality.
            rating = await self._listing_rating(db, listing.id)
            if rating:
                scores[listing.id] += float(rating) * 0.5

        # Delivery consolidation bonus: listings already in user's cart.
        if user_id:
            cart_listing_ids = await self._cart_listing_ids(db, user_id)
            for listing_id in list(cart_listing_ids):
                scores[listing_id] += 2.0

        exclude = {str(i) for i in (exclude_listing_ids or [])}
        ranked = sorted(
            ((scores[l.id], reasons[l.id], l) for l in listings if str(l.id) not in exclude),
            key=lambda pair: pair[0],
            reverse=True,
        )

        return [
            {
                "listing": listing,
                "score": round(score, 2),
                "reasons": reasons,
            }
            for score, reasons, listing in ranked[: self.limit]
        ]

    # ---------- Signals ----------

    @staticmethod
    async def _product_affinity(db: AsyncSession, user_id: uuid.UUID) -> dict[uuid.UUID, float]:
        orders = (
            await db.execute(select(Order.id).where(Order.user_id == user_id))
        ).scalars().all()
        if not orders:
            return {}
        items = (
            await db.execute(
                select(OrderItem).where(OrderItem.order_id.in_(list(orders)))
            )
        ).scalars().all()

        counts: Counter[int] = Counter()
        for item in items:
            listing = (
                await db.execute(select(ProductListing).where(ProductListing.id == item.product_listing_id))
            ).scalar_one_or_none()
            if listing is not None:
                counts[listing.product_id] += int(item.quantity)

        total = sum(counts.values()) or 1
        return {uuid.UUID(pid): count / total for pid, count in counts.items()}

    @staticmethod
    def _seasonal_fit(listing: ProductListing) -> float:
        """0..1 indicator if a product is currently in season in Tamil Nadu."""
        if listing.harvest_date is None:
            return 0.2
        from datetime import date, timedelta

        season_map = {
            1: 0.6, 2: 0.5, 3: 0.4, 4: 0.3, 5: 0.4, 6: 0.5,
            7: 0.6, 8: 0.7, 9: 0.8, 10: 0.7, 11: 0.6, 12: 0.6,
        }
        month = date.today().month
        base = season_map.get(month, 0.5)
        listing_date = listing.harvest_date
        if listing_date >= date.today() - timedelta(days=7):
            base += 0.3
        return min(1.0, base)

    @staticmethod
    async def _listing_rating(db: AsyncSession, listing_id: uuid.UUID) -> float | None:
        from sqlalchemy import func

        return (
            await db.execute(select(func.avg(Review.rating)).where(Review.product_listing_id == listing_id))
        ).scalar_one_or_none()

    @staticmethod
    async def _cart_listing_ids(db: AsyncSession, user_id: uuid.UUID) -> set[uuid.UUID]:
        from app.models.order import Cart

        carts = (
            await db.execute(select(Cart.id).where(Cart.user_id == user_id))
        ).scalars().all()
        if not carts:
            return set()
        listing_ids = (
            await db.execute(
                select(CartItem.product_listing_id).where(CartItem.cart_id.in_(list(carts)))
            )
        ).scalars().all()
        return {uuid.UUID(str(i)) for i in listing_ids}


def listing_farmer_coord(listing: ProductListing) -> tuple[float, float] | None:
    """Approximate farm coordinate from a listing's Pincode-free location fields."""
    if not isinstance(listing.location_district, str):
        return None
    # Fallback: no stored coords on listing — leave None; the caller may
    # enrich with FarmerProfile coords separately.
    return None


class RecommendationService:
    """Persistence and delivery of recommendations."""

    @staticmethod
    async def save_recommendations(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        recommendations: list[dict[str, Any]],
    ) -> list[Any]:
        """Persist top recommendations as records."""
        from datetime import timedelta

        from app.models.ai import Recommendation, RecommendationType
        from app.utils.helpers import now_utc

        saved: list[Any] = []
        for entry in recommendations[:10]:
            listing = entry["listing"]
            rec = Recommendation(
                user_id=user_id,
                type=RecommendationType.RESTOCK,
                title=listing.product.name if listing.product else "Recommended produce",
                message="Recommended based on your location, season and history.",
                data_json=list(entry["reasons"]),
                confidence=min(1.0, entry["score"] / 10.0),
                product_id=listing.product_id,
                location_district=listing.location_district,
                expires_at=now_utc() + timedelta(days=3),
            )
            db.add(rec)
            saved.append(rec)

        if saved:
            await db.commit()
            for rec in saved:
                await db.refresh(rec)
        return saved
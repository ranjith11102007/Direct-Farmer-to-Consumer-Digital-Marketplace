"""Product service: CRUD, search, filtering, recommendations."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.batch import Batch
from app.models.product import (
    Category,
    ListingStatus,
    Product,
    ProductListing,
    ProductUnit,
)
from app.models.user import User
from app.utils.helpers import paginate_query
from app.utils.validators import ValidationError, validate_price, validate_quantity


class ProductService:
    """Operations on products, categories and listings."""

    # ---------- Categories ----------

    @staticmethod
    async def list_categories(db: AsyncSession, *, include_inactive: bool = False) -> list[Category]:
        stmt = select(Category).order_by(Category.sort_order, Category.name)
        if not include_inactive:
            stmt = stmt.where(Category.is_active.is_(True))
        result = await db.execute(stmt)
        return list(result.scalars().unique().all())

    @staticmethod
    async def get_category(db: AsyncSession, category_id: uuid.UUID) -> Category | None:
        return (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()

    @staticmethod
    async def create_category(db: AsyncSession, *, name: str, slug: str, **kwargs: Any) -> Category:
        exists = (await db.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
        if exists:
            raise ValidationError("A category with this slug already exists.")
        category = Category(name=name, slug=slug, **kwargs)
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    # ---------- Products ----------

    @staticmethod
    async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product | None:
        return (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()

    @staticmethod
    async def create_product(
        db: AsyncSession,
        *,
        name: str,
        category_id: uuid.UUID,
        unit: ProductUnit = ProductUnit.KG,
        **kwargs: Any,
    ) -> Product:
        product = Product(name=name, category_id=category_id, unit=unit, **kwargs)
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return product

    # ---------- Listings ----------

    @staticmethod
    async def create_listing(
        db: AsyncSession,
        *,
        producer_id: uuid.UUID,
        product_id: uuid.UUID,
        price_per_unit: float,
        available_quantity: float,
        **kwargs: Any,
    ) -> ProductListing:
        price = validate_price(price_per_unit)
        qty = validate_quantity(available_quantity)
        listing = ProductListing(
            producer_id=producer_id,
            product_id=product_id,
            price_per_unit=price,
            available_quantity=qty,
            status=ListingStatus.ACTIVE,
            **kwargs,
        )
        db.add(listing)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def update_listing(
        db: AsyncSession,
        listing_id: uuid.UUID,
        *,
        producer_id: uuid.UUID | None = None,
        **updates: Any,
    ) -> ProductListing:
        listing = (
            await db.execute(select(ProductListing).where(ProductListing.id == listing_id))
        ).scalar_one_or_none()
        if listing is None:
            raise ValidationError("Listing not found.")
        if producer_id is not None and str(listing.producer_id) != str(producer_id):
            raise ValidationError("You do not own this listing.")

        if "price_per_unit" in updates:
            updates["price_per_unit"] = validate_price(updates["price_per_unit"])
        if "available_quantity" in updates:
            updates["available_quantity"] = validate_quantity(updates["available_quantity"])

        for key, value in updates.items():
            if hasattr(listing, key):
                setattr(listing, key, value)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def get_listing(db: AsyncSession, listing_id: uuid.UUID, *, active_only: bool = False) -> ProductListing | None:
        stmt = select(ProductListing).where(ProductListing.id == listing_id)
        if active_only:
            stmt = stmt.where(ProductListing.status == ListingStatus.ACTIVE)
        return (await db.execute(stmt)).scalar_one_or_none()

    # ---------- Search ----------

    @staticmethod
    async def search(
        db: AsyncSession,
        *,
        query: str | None = None,
        category_id: uuid.UUID | None = None,
        district: str | None = None,
        state: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        organic_only: bool = False,
        producer_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        stmt = (
            select(ProductListing)
            .join(Product)
            .where(ProductListing.status == ListingStatus.ACTIVE)
            .where(ProductListing.available_quantity > 0)
        )

        if query:
            like = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Product.name.ilike(like),
                    Product.name_tamil.ilike(like),
                    Product.description.ilike(like),
                )
            )
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)
        if district:
            stmt = stmt.where(ProductListing.location_district == district)
        if state:
            stmt = stmt.where(ProductListing.location_state == state)
        if min_price is not None:
            stmt = stmt.where(ProductListing.price_per_unit >= float(min_price))
        if max_price is not None:
            stmt = stmt.where(ProductListing.price_per_unit <= float(max_price))
        if organic_only:
            stmt = stmt.where(ProductListing.organic_certified.is_(True))
        if producer_type:
            stmt = stmt.where(ProductListing.producer_type == producer_type)

        stmt = stmt.order_by(ProductListing.organic_certified.desc(), ProductListing.price_per_unit.asc())
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def get_nearby(
        db: AsyncSession,
        *,
        lat: float,
        lng: float,
        radius_km: float = 50.0,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        """Filter listings from farms within a bounding-box of the given coords.

        A full geospatial query would use PostGIS; here we use a simpler
        bounding box approximation derived from the radius.
        """
        KM_PER_DEG = 111.0
        delta_lat = radius_km / KM_PER_DEG
        delta_lng = radius_km / (KM_PER_DEG * max(1.0, abs(lat) ** 0.5))

        from app.models.farmer import FarmerProfile

        farmer_ids = (
            await db.execute(
                select(FarmerProfile.user_id).where(
                    FarmerProfile.farm_latitude.is_not(None),
                    FarmerProfile.farm_longitude.is_not(None),
                    FarmerProfile.farm_latitude.between(lat - delta_lat, lat + delta_lat),
                    FarmerProfile.farm_longitude.between(lng - delta_lng, lng + delta_lng),
                )
            )
        ).scalars().all()

        stmt = (
            select(ProductListing)
            .where(ProductListing.status == ListingStatus.ACTIVE)
            .where(ProductListing.available_quantity > 0)
            .where(ProductListing.producer_id.in_(list(farmer_ids)))
            .order_by(ProductListing.price_per_unit.asc())
        )
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def get_recommendations(
        db: AsyncSession,
        *,
        user: User | None = None,
        district: str | None = None,
        limit: int = 8,
    ) -> list[ProductListing]:
        stmt = (
            select(ProductListing)
            .where(ProductListing.status == ListingStatus.ACTIVE)
            .where(ProductListing.available_quantity > 0)
            .order_by(
                ProductListing.organic_certified.desc(),
                ProductListing.created_at.desc(),
            )
            .limit(limit)
        )

        if district:
            stmt = stmt.where(
                or_(
                    ProductListing.location_district == district,
                    ProductListing.location_district.is_(None),
                )
            )

        result = await db.execute(stmt)
        return list(result.scalars().unique().all())

    @staticmethod
    async def auto_expire_listings(db: AsyncSession) -> int:
        """Mark listings past expiry_date or with zero stock as expired."""
        from datetime import datetime, timezone

        expired = (
            await db.execute(
                select(ProductListing).where(
                    ProductListing.status == ListingStatus.ACTIVE,
                    ProductListing.expiry_date.is_not(None),
                    ProductListing.expiry_date < datetime.now(timezone.utc).date(),
                )
            )
        ).scalars().all()
        sold_out = (
            await db.execute(
                select(ProductListing).where(
                    ProductListing.status == ListingStatus.ACTIVE,
                    ProductListing.available_quantity <= 0,
                )
            )
        ).scalars().all()

        count = 0
        for listing in list(expired) + list(sold_out):
            listing.status = ListingStatus.EXPIRED if listing in expired else ListingStatus.SOLD_OUT
            count += 1
        if count:
            await db.commit()
        return count
"""Inventory service with stock management, reservation and ledger safety."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import ChangeType, InventoryLedger
from app.models.product import ListingStatus, ProductListing
from app.utils.validators import ValidationError, validate_quantity


class InventoryService:
    """Thread-safe inventory operations using conditional UPDATE races."""

    @staticmethod
    async def _log(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        change_type: ChangeType,
        quantity_change: float,
        quantity_after: float,
        batch_id: uuid.UUID | None = None,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        notes: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> InventoryLedger:
        entry = InventoryLedger(
            product_listing_id=listing_id,
            batch_id=batch_id,
            change_type=change_type,
            quantity_change=quantity_change,
            quantity_after=quantity_after,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=notes,
            created_by=created_by,
        )
        db.add(entry)
        return entry

    @staticmethod
    async def adjust(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        delta: float,
        change_type: ChangeType,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        notes: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        """Atomically adjust a listing's available quantity.

        Uses a conditional UPDATE so concurrent calls cannot oversell.
        Returns (quantity_after, error).
        """
        try:
            delta = float(validate_quantity(abs(delta)) * (1 if delta >= 0 else -1))
        except (ValidationError, ValueError) as exc:
            return 0.0, exc

        result = await db.execute(
            update(ProductListing)
            .where(
                ProductListing.id == listing_id,
                ProductListing.available_quantity + delta >= 0,
            )
            .values(available_quantity=ProductListing.available_quantity + delta)
            .returning(ProductListing.available_quantity)
        )
        row = result.first()
        if row is None:
            return 0.0, ValidationError("Insufficient stock to apply this adjustment.")

        quantity_after = float(row[0])
        await InventoryService._log(
            db,
            listing_id=listing_id,
            change_type=change_type,
            quantity_change=delta,
            quantity_after=quantity_after,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=notes,
            created_by=created_by,
        )
        await db.commit()

        if quantity_after <= 0:
            await db.execute(
                update(ProductListing)
                .where(ProductListing.id == listing_id)
                .values(status=ListingStatus.SOLD_OUT)
            )
            await db.commit()
        return quantity_after, None

    @staticmethod
    async def receive(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        quantity: float,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=quantity,
            change_type=ChangeType.RECEIVED,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
        )

    @staticmethod
    async def reserve(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        quantity: float,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=-quantity,
            change_type=ChangeType.RESERVED,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
        )

    @staticmethod
    async def release(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        quantity: float,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=quantity,
            change_type=ChangeType.RELEASED,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
        )

    @staticmethod
    async def sell(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        quantity: float,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=-quantity,
            change_type=ChangeType.SOLD,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
        )

    @staticmethod
    async def spoil(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID,
        quantity: float,
        reference_id: uuid.UUID | None = None,
        reference_type: str | None = None,
        created_by: uuid.UUID | None = None,
    ) -> tuple[float, Exception | None]:
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=-quantity,
            change_type=ChangeType.SPOILED,
            reference_id=reference_id,
            reference_type=reference_type,
            created_by=created_by,
        )

    # ---------- Queries ----------

    @staticmethod
    async def stock_level(db: AsyncSession, listing_id: uuid.UUID) -> float:
        listing = (
            await db.execute(select(ProductListing).where(ProductListing.id == listing_id))
        ).scalar_one_or_none()
        return float(listing.available_quantity) if listing else 0.0

    @staticmethod
    async def get_ledger(
        db: AsyncSession,
        *,
        listing_id: uuid.UUID | None = None,
        reference_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(InventoryLedger).order_by(InventoryLedger.created_at.desc())
        if listing_id:
            stmt = stmt.where(InventoryLedger.product_listing_id == listing_id)
        if reference_id:
            stmt = stmt.where(InventoryLedger.reference_id == reference_id)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def bulk_set_quantity(db: AsyncSession, listing_id: uuid.UUID, quantity: float) -> tuple[float, Exception | None]:
        """Set an absolute stock level and record an 'adjustment' ledger entry."""
        listing = (
            await db.execute(select(ProductListing).where(ProductListing.id == listing_id))
        ).scalar_one_or_none()
        if listing is None:
            return 0.0, ValidationError("Listing not found.")
        delta = quantity - float(listing.available_quantity)
        if abs(delta) < 1e-6:
            return float(listing.available_quantity), None
        return await InventoryService.adjust(
            db,
            listing_id=listing_id,
            delta=delta,
            change_type=ChangeType.ADJUSTED,
            notes="Manual stock set",
        )
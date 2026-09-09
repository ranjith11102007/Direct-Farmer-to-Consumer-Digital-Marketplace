"""Bulk procurement service: requirements, quotations, purchase orders."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bulk import (
    BulkRequirement,
    PurchaseOrder,
    PurchaseOrderStatus,
    Quotation,
    QuotationStatus,
    RequirementStatus,
)
from app.utils.helpers import now_utc
from app.utils.validators import ValidationError, validate_quantity


class BulkProcurementService:
    """Manage bulk requirements, quotations and purchase orders."""

    # ---------- Requirements ----------

    @staticmethod
    async def create_requirement(
        db: AsyncSession,
        *,
        buyer_id: uuid.UUID,
        product_id: uuid.UUID,
        quantity: float,
        unit: str = "kg",
        **kwargs: Any,
    ) -> BulkRequirement:
        qty = validate_quantity(quantity)
        requirement = BulkRequirement(
            buyer_id=buyer_id,
            product_id=product_id,
            quantity=qty,
            unit=unit,
            status=RequirementStatus.OPEN,
            **kwargs,
        )
        db.add(requirement)
        await db.commit()
        await db.refresh(requirement)
        return requirement

    @staticmethod
    async def get_requirement(db: AsyncSession, requirement_id: uuid.UUID) -> BulkRequirement | None:
        return (
            await db.execute(select(BulkRequirement).where(BulkRequirement.id == requirement_id))
        ).scalar_one_or_none()

    @staticmethod
    async def list_requirements(
        db: AsyncSession,
        *,
        status: RequirementStatus | None = None,
        buyer_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(BulkRequirement).order_by(BulkRequirement.created_at.desc())
        if status:
            stmt = stmt.where(BulkRequirement.status == status)
        if buyer_id:
            stmt = stmt.where(BulkRequirement.buyer_id == buyer_id)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def update_requirement_status(
        db: AsyncSession,
        requirement: BulkRequirement,
        status: RequirementStatus,
    ) -> BulkRequirement:
        requirement.status = status
        await db.commit()
        await db.refresh(requirement)
        return requirement

    # ---------- Quotations ----------

    @staticmethod
    async def create_quotation(
        db: AsyncSession,
        *,
        requirement_id: uuid.UUID,
        responder_id: uuid.UUID,
        responder_type: str,
        price_per_unit: float,
        quantity: float | None = None,
        **kwargs: Any,
    ) -> Quotation:
        requirement = (
            await db.execute(select(BulkRequirement).where(BulkRequirement.id == requirement_id))
        ).scalar_one_or_none()
        if requirement is None:
            raise ValidationError("Requirement not found.")
        if requirement.status not in (RequirementStatus.OPEN, RequirementStatus.QUOTED):
            raise ValidationError("This requirement is no longer accepting quotations.")

        price = Decimal(str(price_per_unit))
        qty = float(quantity) if quantity is not None else float(requirement.quantity)
        total = float(price * Decimal(str(qty)))

        quotation = Quotation(
            requirement_id=requirement.id,
            responder_id=responder_id,
            responder_type=responder_type,
            price_per_unit=float(price),
            total_price=total,
            **kwargs,
        )
        db.add(quotation)

        if requirement.status == RequirementStatus.OPEN:
            requirement.status = RequirementStatus.QUOTED

        await db.commit()
        await db.refresh(quotation)
        return quotation

    @staticmethod
    async def accept_quotation(
        db: AsyncSession,
        quotation: Quotation,
        *,
        buyer_id: uuid.UUID,
        payment_terms: str | None = None,
    ) -> PurchaseOrder:
        requirement = (
            await db.execute(select(BulkRequirement).where(BulkRequirement.id == quotation.requirement_id))
        ).scalar_one_or_none()
        if requirement is None:
            raise ValidationError("Requirement not found.")
        if requirement.buyer_id != buyer_id:
            raise ValidationError("Only the buyer who posted this requirement can accept quotations.")
        if quotation.status != QuotationStatus.PENDING:
            raise ValidationError(f"Quotation is already {quotation.status.value}.")

        quotation.status = QuotationStatus.ACCEPTED
        requirement.status = RequirementStatus.ACCEPTED

        purchase_order = PurchaseOrder(
            requirement_id=requirement.id,
            quotation_id=quotation.id,
            buyer_id=buyer_id,
            supplier_id=quotation.responder_id,
            items_json=[
                {
                    "product_id": str(requirement.product_id),
                    "quantity": requirement.quantity,
                    "unit": requirement.unit,
                    "price_per_unit": quotation.price_per_unit,
                    "total": quotation.total_price,
                }
            ],
            total_amount=quotation.total_price,
            payment_terms=payment_terms,
            status=PurchaseOrderStatus.CONFIRMED,
        )
        db.add(purchase_order)
        await db.commit()
        await db.refresh(purchase_order)
        return purchase_order

    @staticmethod
    async def reject_quotation(db: AsyncSession, quotation: Quotation) -> Quotation:
        if quotation.status != QuotationStatus.PENDING:
            raise ValidationError(f"Quotation is already {quotation.status.value}.")
        quotation.status = QuotationStatus.REJECTED
        await db.commit()
        await db.refresh(quotation)
        return quotation

    @staticmethod
    async def list_quotations(
        db: AsyncSession,
        *,
        requirement_id: uuid.UUID | None = None,
        responder_id: uuid.UUID | None = None,
    ) -> list[Quotation]:
        stmt = select(Quotation).order_by(Quotation.total_price.asc())
        if requirement_id:
            stmt = stmt.where(Quotation.requirement_id == requirement_id)
        if responder_id:
            stmt = stmt.where(Quotation.responder_id == responder_id)
        return list((await db.execute(stmt)).scalars().unique().all())

    @staticmethod
    async def expire_stale_quotations(db: AsyncSession) -> int:
        stale = (
            await db.execute(
                select(Quotation).where(
                    Quotation.status == QuotationStatus.PENDING,
                    Quotation.valid_until.is_not(None),
                    Quotation.valid_until < now_utc(),
                )
            )
        ).scalars().all()
        for q in stale:
            q.status = QuotationStatus.EXPIRED
        if stale:
            await db.commit()
        return len(stale)

    # ---------- Purchase orders ----------

    @staticmethod
    async def get_purchase_order(db: AsyncSession, po_id: uuid.UUID) -> PurchaseOrder | None:
        return (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()

    @staticmethod
    async def list_purchase_orders(
        db: AsyncSession,
        *,
        buyer_id: uuid.UUID | None = None,
        supplier_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
        if buyer_id:
            stmt = stmt.where(PurchaseOrder.buyer_id == buyer_id)
        if supplier_id:
            stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def update_po_status(
        db: AsyncSession,
        purchase_order: PurchaseOrder,
        status: PurchaseOrderStatus,
    ) -> PurchaseOrder:
        purchase_order.status = status
        await db.commit()
        await db.refresh(purchase_order)
        return purchase_order

    # ---------- Recurring ----------

    @staticmethod
    async def create_recurring_orders(db: AsyncSession) -> int:
        """Generate next-cycle orders for recurring requirements.

        Production would use Celery beats; this is the executable core.
        """
        updated = 0
        recurring = (
            await db.execute(
                select(BulkRequirement).where(
                    BulkRequirement.schedule_type != "one_time",
                    BulkRequirement.status == RequirementStatus.FULFILLED,
                )
            )
        ).scalars().all()
        for req in recurring:
            new_req = BulkRequirement(
                buyer_id=req.buyer_id,
                product_id=req.product_id,
                grade=req.grade,
                quantity=req.quantity,
                unit=req.unit,
                delivery_location_json=req.delivery_location_json,
                schedule_type=req.schedule_type,
                target_price=req.target_price,
                packaging_requirements=req.packaging_requirements,
                quality_specs=req.quality_specs,
                deadline=req.deadline,
                status=RequirementStatus.OPEN,
            )
            db.add(new_req)
            updated += 1
        if updated:
            await db.commit()
        return updated
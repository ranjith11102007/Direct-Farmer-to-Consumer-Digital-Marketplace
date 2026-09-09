"""Settlement service: farmer payout calculation and tracking."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.order import Order, OrderItem, Settlement, SettlementStatus
from app.utils.validators import ValidationError


class SettlementService:
    """Compute farmer shares and manage settlement lifecycle."""

    @staticmethod
    async def create_for_order(db: AsyncSession, order: Order) -> Settlement | None:
        existing = (
            await db.execute(select(Settlement).where(Settlement.order_id == order.id))
        ).scalar_one_or_none()
        if existing is not None:
            return existing

        items = (
            await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
        ).scalars().all()

        from app.models.order import OrderStatus

        if order.status not in (OrderStatus.DELIVERED, OrderStatus.REFUNDED) and not items:
            return None

        # Group by producer to support multi-farmer orders.
        producer_totals: dict[uuid.UUID, Decimal] = {}
        for item in items:
            producer_totals[item.producer_id] = (
                producer_totals.get(item.producer_id, Decimal("0"))
                + Decimal(str(item.total_price))
            )

        created: list[Settlement] = []
        for farmer_id, amount in producer_totals.items():
            platform_fee = (amount * Decimal(str(settings.PLATFORM_FEE_PERCENT))) / Decimal("100")
            logistics_share = Decimal(str(order.delivery_charge)) / Decimal(max(1, len(producer_totals)))
            net = amount - platform_fee - logistics_share

            settlement = Settlement(
                order_id=order.id,
                farmer_id=farmer_id,
                amount=float(amount),
                platform_fee=float(platform_fee),
                logistics_deduction=float(logistics_share),
                net_settlement=float(net),
                status=SettlementStatus.PENDING,
            )
            db.add(settlement)
            created.append(settlement)

        await db.commit()
        for s in created:
            await db.refresh(s)
        return created[0] if created else None

    @staticmethod
    async def list_for_farmer(
        db: AsyncSession,
        *,
        farmer_id: uuid.UUID,
        status: SettlementStatus | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(Settlement).where(Settlement.farmer_id == farmer_id).order_by(Settlement.created_at.desc())
        if status:
            stmt = stmt.where(Settlement.status == status)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def get(db: AsyncSession, settlement_id: uuid.UUID) -> Settlement | None:
        return (await db.execute(select(Settlement).where(Settlement.id == settlement_id))).scalar_one_or_none()

    @staticmethod
    async def update_status(
        db: AsyncSession,
        settlement: Settlement,
        status: SettlementStatus,
        *,
        settled_at: bool = True,
    ) -> Settlement:
        settlement.status = status
        if settled_at and status in (SettlementStatus.SETTLED, SettlementStatus.PARTIALLY_SETTLED):
            settlement.settled_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(settlement)
        return settlement

    @staticmethod
    async def mark_paid(db: AsyncSession, settlement: Settlement) -> Settlement:
        return await SettlementService.update_status(db, settlement, SettlementStatus.SETTLED)

    @staticmethod
    async def hold(db: AsyncSession, settlement: Settlement) -> Settlement:
        return await SettlementService.update_status(db, settlement, SettlementStatus.HELD, settled_at=False)

    @staticmethod
    async def totals_for_farmer(db: AsyncSession, farmer_id: uuid.UUID) -> dict[str, float]:
        records = (
            await db.execute(
                select(Settlement).where(
                    Settlement.farmer_id == farmer_id,
                    Settlement.status.in_([SettlementStatus.SETTLED, SettlementStatus.PARTIALLY_SETTLED]),
                )
            )
        ).scalars().all()
        pending = (
            await db.execute(
                select(Settlement).where(
                    Settlement.farmer_id == farmer_id,
                    Settlement.status == SettlementStatus.PENDING,
                )
            )
        ).scalars().all()

        return {
            "settled_amount": float(sum(Decimal(str(r.net_settlement)) for r in records)),
            "pending_amount": float(sum(Decimal(str(r.net_settlement)) for r in pending)),
            "settled_count": len(records),
            "pending_count": len(pending),
        }

    @staticmethod
    async def payout_all_due(db: AsyncSession) -> int:
        """Mark all pending settlements as settled (mock payout).

        A real implementation would call the bank/payout provider for each.
        """
        pending = (
            await db.execute(select(Settlement).where(Settlement.status == SettlementStatus.PENDING))
        ).scalars().all()
        count = 0
        for s in pending:
            await SettlementService.mark_paid(db, s)
            count += 1
        return count
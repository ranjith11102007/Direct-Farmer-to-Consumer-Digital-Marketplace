"""Order service: cart, checkout, payment verification, lifecycle."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.order import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
)
from app.models.product import ListingStatus, ProductListing
from app.models.delivery import Delivery, DeliveryStatus
from app.utils.helpers import generate_order_number, now_utc
from app.utils.validators import ValidationError, validate_quantity
from app.services.inventory import InventoryService


class OrderService:
    """Cart management, checkout, payment and order lifecycle."""

    # ---------- Cart ----------

    @staticmethod
    async def get_or_create_cart(db: AsyncSession, *, user_id: uuid.UUID | None = None, session_id: str | None = None) -> Cart:
        if user_id:
            cart = (
                await db.execute(select(Cart).where(Cart.user_id == user_id).order_by(Cart.created_at.desc()))
            ).scalars().first()
        elif session_id:
            cart = (
                await db.execute(select(Cart).where(Cart.session_id == session_id).order_by(Cart.created_at.desc()))
            ).scalars().first()
        else:
            cart = None

        if cart is None:
            cart = Cart(user_id=user_id, session_id=session_id)
            db.add(cart)
            await db.commit()
            await db.refresh(cart)
        elif user_id and cart.user_id is None and session_id and cart.session_id != session_id:
            cart.session_id = session_id
            await db.commit()
        return cart

    @staticmethod
    async def add_cart_item(
        db: AsyncSession,
        *,
        cart: Cart,
        product_listing_id: uuid.UUID,
        quantity: float,
    ) -> CartItem:
        qty = validate_quantity(quantity, "quantity")
        listing = (
            await db.execute(select(ProductListing).where(ProductListing.id == product_listing_id))
        ).scalar_one_or_none()
        if listing is None or listing.status != ListingStatus.ACTIVE:
            raise ValidationError("This listing is not available.")
        if qty < float(listing.min_order_quantity):
            raise ValidationError(f"Minimum order quantity is {listing.min_order_quantity}.")

        existing = (
            await db.execute(
                select(CartItem).where(
                    CartItem.cart_id == cart.id,
                    CartItem.product_listing_id == product_listing_id,
                )
            )
        ).scalar_one_or_none()
        if existing:
            existing.quantity = float(existing.quantity) + qty
            item = existing
        else:
            item = CartItem(
                cart_id=cart.id,
                product_listing_id=product_listing_id,
                quantity=qty,
            )
            db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_cart_item(db: AsyncSession, cart: Cart, item_id: uuid.UUID, quantity: float) -> CartItem:
        item = (
            await db.execute(
                select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
            )
        ).scalar_one_or_none()
        if item is None:
            raise ValidationError("Cart item not found.")
        item.quantity = validate_quantity(quantity)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def remove_cart_item(db: AsyncSession, cart: Cart, item_id: uuid.UUID) -> None:
        item = (
            await db.execute(
                select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
            )
        ).scalar_one_or_none()
        if item is None:
            raise ValidationError("Cart item not found.")
        await db.delete(item)
        await db.commit()

    @staticmethod
    async def get_cart(db: AsyncSession, user_id: uuid.UUID, session_id: str | None = None) -> Cart | None:
        stmt = select(Cart).options(selectinload(Cart.items)).where(Cart.user_id == user_id)
        if session_id:
            stmt = select(Cart).options(selectinload(Cart.items)).where(
                (Cart.user_id == user_id) | (Cart.session_id == session_id)
            )
        return (await db.execute(stmt.order_by(Cart.created_at.desc()))).scalars().first()

    # ---------- Checkout ----------

    @staticmethod
    async def checkout(
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        cart: Cart,
        delivery_address_json: dict,
        delivery_slot_start: datetime | None = None,
        delivery_slot_end: datetime | None = None,
        notes: str | None = None,
        payment_method: PaymentMethod = PaymentMethod.UPI,
    ) -> tuple[Order, list[Payment], Exception | None]:
        items = (
            await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))
        ).scalars().all()
        if not items:
            return None, [], ValidationError("Cart is empty.")

        subtotal = Decimal("0")
        order_items: list[dict[str, Any]] = []
        for item in items:
            listing = (
                await db.execute(select(ProductListing).where(ProductListing.id == item.product_listing_id))
            ).scalar_one_or_none()
            if listing is None or listing.status != ListingStatus.ACTIVE:
                await db.delete(item)
                await db.commit()
                raise ValidationError("A product in your cart is no longer available. Please review your cart.")

            qty_left, err = await InventoryService.reserve(
                db,
                listing_id=listing.id,
                quantity=float(item.quantity),
                reference_id=cart.id,
                reference_type="cart_checkout",
            )
            if err is not None:
                raise ValidationError(f"Not enough stock for {listing.product.name if listing.product else listing.id}. {err}")

            unit_price = Decimal(str(listing.price_per_unit))
            line_total = unit_price * Decimal(str(item.quantity))
            subtotal += line_total
            order_items.append({
                "listing": listing,
                "quantity": item.quantity,
                "unit_price": unit_price,
                "total_price": line_total,
            })

        delivery_charge = Decimal(str(settings.DELIVERY_CHARGE_FLAT))
        if subtotal >= Decimal(str(settings.MIN_ORDER_VALUE_FREE_DELIVERY)):
            delivery_charge = Decimal("0")
        packaging_charge = (subtotal * Decimal(str(settings.PACKAGING_CHARGE_PERCENT))) / Decimal("100")
        platform_fee = (subtotal * Decimal(str(settings.PLATFORM_FEE_PERCENT))) / Decimal("100")
        tax = Decimal("0")
        discount = Decimal("0")
        total = subtotal + delivery_charge + packaging_charge + platform_fee + tax - discount

        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            status=OrderStatus.PENDING,
            delivery_address_json=delivery_address_json,
            delivery_slot_start=delivery_slot_start,
            delivery_slot_end=delivery_slot_end,
            subtotal=float(subtotal),
            delivery_charge=float(delivery_charge),
            packaging_charge=float(packaging_charge),
            platform_fee=float(platform_fee),
            tax=float(tax),
            discount=float(discount),
            total=float(total),
            farmer_share_estimate=float(subtotal - platform_fee),
            notes=notes,
        )
        db.add(order)
        await db.flush()

        for entry in order_items:
            listing = entry["listing"]
            order_item = OrderItem(
                order_id=order.id,
                product_listing_id=listing.id,
                batch_id=listing.batch_id,
                producer_id=listing.producer_id,
                quantity=entry["quantity"],
                unit_price=float(entry["unit_price"]),
                total_price=float(entry["total_price"]),
                quality_grade=listing.grade,
                status="confirmed",
            )
            db.add(order_item)

        payment = Payment(
            order_id=order.id,
            amount=float(total),
            method=payment_method,
            provider=settings.PAYMENT_PROVIDER,
            status=PaymentStatus.PENDING,
        )
        db.add(payment)

        await db.delete(cart)
        await db.commit()
        await db.refresh(order)
        from app.models.order import Cart as _CartAlias
        payments = (await db.execute(select(Payment).where(Payment.order_id == order.id))).scalars().all()
        return order, list(payments), None

    # ---------- Payment ----------

    @staticmethod
    async def mark_payment_completed(db: AsyncSession, payment: Payment, provider_reference: str | None = None) -> Payment:
        payment.status = PaymentStatus.COMPLETED
        payment.paid_at = now_utc()
        if provider_reference:
            payment.provider_reference = provider_reference

        order = (
            await db.execute(select(Order).where(Order.id == payment.order_id))
        ).scalar_one_or_none()
        if order is not None and order.status == OrderStatus.PENDING:
            order.status = OrderStatus.CONFIRMED

        # Create delivery record
        delivery = Delivery(
            order_id=order.id,
            status=DeliveryStatus.PENDING,
            delivery_address_json=order.delivery_address_json,
            otp_code=OrderService._generate_otp(),
        )
        db.add(delivery)
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    def _generate_otp() -> str:
        import random
        return f"{random.randint(0, 999999):06d}"

    # ---------- Lifecycle ----------

    @staticmethod
    async def get_order(db: AsyncSession, order_id: uuid.UUID, *, user_id: uuid.UUID | None = None) -> Order | None:
        stmt = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        if user_id:
            stmt = stmt.where(Order.user_id == user_id)
        return (await db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    async def list_orders(db: AsyncSession, *, user_id: uuid.UUID | None = None, page: int = 1, page_size: int = 20) -> dict[str, Any]:
        from app.utils.helpers import paginate_query

        stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
        if user_id:
            stmt = stmt.where(Order.user_id == user_id)
        return await paginate_query(db, stmt, page=page, page_size=page_size)

    @staticmethod
    async def update_status(db: AsyncSession, order: Order, new_status: OrderStatus, *, actor: str | None = None) -> Order:
        allowed = {
            OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
            OrderStatus.CONFIRMED: [OrderStatus.PRODUCER_ACCEPTED, OrderStatus.CANCELLED],
            OrderStatus.PRODUCER_ACCEPTED: [OrderStatus.PRODUCE_COLLECTED, OrderStatus.CANCELLED],
            OrderStatus.PRODUCE_COLLECTED: [OrderStatus.QUALITY_CHECKED],
            OrderStatus.QUALITY_CHECKED: [OrderStatus.PACKED],
            OrderStatus.PACKED: [OrderStatus.DISPATCHED],
            OrderStatus.DISPATCHED: [OrderStatus.OUT_FOR_DELIVERY],
            OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
            OrderStatus.DELIVERED: [],
            OrderStatus.CANCELLED: [],
            OrderStatus.REFUNDED: [],
        }
        if new_status not in allowed.get(order.status, []):
            raise ValidationError(f"Cannot transition order from {order.status.value} to {new_status.value}.")

        # Only net stock impact on cancellation.
        if new_status == OrderStatus.CANCELLED and order.status not in (OrderStatus.CANCELLED, OrderStatus.REFUNDED):
            order_items = (
                await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
            ).scalars().all()
            for item in order_items:
                await InventoryService.release(
                    db,
                    listing_id=item.product_listing_id,
                    quantity=item.quantity,
                    reference_id=item.order_id,
                    reference_type="order_cancel",
                )

        order.status = new_status

        if new_status == OrderStatus.DELIVERED and order.settlement is None:
            from app.services.settlement import SettlementService
            await SettlementService.create_for_order(db, order)

        await db.commit()
        await db.refresh(order)
        return order

    # ---------- Cancellation & refund ----------

    @staticmethod
    async def cancel(db: AsyncSession, order: Order, *, user_id: uuid.UUID | None = None) -> Order:
        if user_id and order.user_id != user_id:
            raise ValidationError("You cannot cancel this order.")
        if order.status in (OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED):
            raise ValidationError(f"Order is already {order.status.value}.")
        return await OrderService.update_status(db, order, OrderStatus.CANCELLED)

    @staticmethod
    async def request_refund(db: AsyncSession, order: Order) -> Payment:
        if order.status not in (OrderStatus.CANCELLED, OrderStatus.DELIVERED):
            raise ValidationError("Refund is only possible for cancelled or completed orders.")
        payment = (
            await db.execute(
                select(Payment).where(Payment.order_id == order.id).order_by(Payment.created_at.desc())
            )
        ).scalars().first()
        if payment is None:
            raise ValidationError("No payment record found for this order.")

        # In practice this calls the payment provider's refund API.
        payment.status = PaymentStatus.REFUNDED
        if order.status != OrderStatus.REFUNDED:
            order.status = OrderStatus.REFUNDED
        await db.commit()
        await db.refresh(payment)
        return payment

    @staticmethod
    async def confirm_delivery(db: AsyncSession, order: Order, otp_code: str | None = None) -> Order:
        delivery = (
            await db.execute(select(Delivery).where(Delivery.order_id == order.id))
        ).scalars().first()
        if delivery is None:
            raise ValidationError("No delivery record found.")
        if otp_code is not None and delivery.otp_code and str(otp_code).strip() != delivery.otp_code:
            raise ValidationError("Incorrect OTP. Delivery confirmation failed.")
        delivery.status = DeliveryStatus.DELIVERED
        delivery.actual_time_minutes = int((datetime.now(timezone.utc) - delivery.created_at).total_seconds() // 60)
        return await OrderService.update_status(db, order, OrderStatus.DELIVERED)
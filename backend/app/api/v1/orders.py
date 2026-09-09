"""Order and cart API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import (
    CurrentUser,
    RateLimitDefault,
    SessionDep,
)
from app.models.order import OrderStatus, Payment
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.order import (
    CancelOrderRequest,
    CartItemAdd,
    CartItemOut,
    CartItemUpdate,
    CartOut,
    CheckoutRequest,
    ConfirmDeliveryRequest,
    OrderCreateOut,
    OrderOut,
    PaymentOut,
    PaymentCompleteRequest,
    SettlementOut,
)
from app.services.order import OrderService
from app.utils.validators import ValidationError
from sqlalchemy import select

router = APIRouter(prefix="/orders", tags=["Orders"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------- Cart ----------

@router.get("/cart", response_model=ApiResponse[CartOut])
async def get_cart(db: SessionDep, user: CurrentUser):
    cart = await OrderService.get_cart(db, user.id)
    if cart is None:
        cart = await OrderService.get_or_create_cart(db, user_id=user.id)
    return ApiResponse(data=CartOut.model_validate(cart).model_dump(mode="json"))


@router.post("/cart/items", response_model=ApiResponse[CartItemOut])
async def add_cart_item(payload: CartItemAdd, db: SessionDep, user: CurrentUser):
    cart = await OrderService.get_or_create_cart(db, user_id=user.id)
    try:
        item = await OrderService.add_cart_item(
            db, cart=cart, product_listing_id=uuid.UUID(payload.product_listing_id),
            quantity=payload.quantity,
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=CartItemOut.model_validate(item).model_dump(mode="json"), message="Added to cart.")


@router.put("/cart/items/{item_id}", response_model=ApiResponse[CartItemOut])
async def update_cart_item(item_id: str, payload: CartItemUpdate, db: SessionDep, user: CurrentUser):
    cart = await OrderService.get_or_create_cart(db, user_id=user.id)
    try:
        item = await OrderService.update_cart_item(db, cart, uuid.UUID(item_id), payload.quantity)
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=CartItemOut.model_validate(item).model_dump(mode="json"), message="Cart updated.")


@router.delete("/cart/items/{item_id}", response_model=ApiResponse[dict])
async def remove_cart_item(item_id: str, db: SessionDep, user: CurrentUser):
    cart = await OrderService.get_or_create_cart(db, user_id=user.id)
    try:
        await OrderService.remove_cart_item(db, cart, uuid.UUID(item_id))
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data={"removed": True}, message="Item removed from cart.")


# ---------- Checkout ----------

@router.post("/checkout", response_model=ApiResponse[OrderCreateOut])
async def checkout(payload: CheckoutRequest, db: SessionDep, user: CurrentUser, _rate: None = RateLimitDefault):
    cart = await OrderService.get_cart(db, user.id)
    if cart is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Your cart is empty.")

    from app.models.order import PaymentMethod

    try:
        method = PaymentMethod(payload.payment_method)
    except ValueError:
        method = PaymentMethod.UPI

    from datetime import datetime

    slot_start = payload.delivery_slot_start.astimezone() if payload.delivery_slot_start else None
    slot_end = payload.delivery_slot_end.astimezone() if payload.delivery_slot_end else None

    order, payments, error = await OrderService.checkout(
        db,
        user_id=user.id,
        cart=cart,
        delivery_address_json=payload.delivery_address_json,
        delivery_slot_start=slot_start,
        delivery_slot_end=slot_end,
        notes=payload.notes,
        payment_method=method,
    )
    if error:
        raise _err(error)
    if order is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Checkout failed.")

    payment_payload = payments[0] if payments else None
    return ApiResponse(
        data={
            "order": OrderOut.model_validate(order).model_dump(mode="json"),
            "payment": PaymentOut.model_validate(payment_payload).model_dump(mode="json") if payment_payload else {},
            "payment_provider": "mock",
        },
        message="Order created. Awaiting payment confirmation.",
    )


@router.post("/payment/complete", response_model=ApiResponse[PaymentOut])
async def complete_payment(payload: PaymentCompleteRequest, db: SessionDep, user: CurrentUser):
    try:
        payment = (
            await db.execute(select(Payment).where(Payment.id == uuid.UUID(payload.payment_id)))
        ).scalar_one_or_none()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid payment id")
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found")

    order = (await db.execute(select(Order).where(Order.id == payment.order_id))).scalar_one_or_none()
    if order is None or order.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")

    payment = await OrderService.mark_payment_completed(db, payment, payload.provider_reference)
    return ApiResponse(data=PaymentOut.model_validate(payment).model_dump(mode="json"), message="Payment completed.")


# ---------- Orders ----------

@router.get("/", response_model=PaginatedResponse[OrderOut])
async def list_orders(
    db: SessionDep,
    user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await OrderService.list_orders(db, user_id=user.id, page=page, page_size=page_size)
    items = [OrderOut.model_validate(o).model_dump(mode="json") for o in result["items"]]
    return PaginatedResponse[OrderOut](
        items=items, page=page, page_size=page_size, total=result["total"],
        total_pages=result["total_pages"], has_next=result["has_next"], has_prev=result["has_prev"],
    )


@router.get("/{order_id}", response_model=ApiResponse[OrderOut])
async def get_order(order_id: str, db: SessionDep, user: CurrentUser):
    try:
        order = await OrderService.get_order(db, uuid.UUID(order_id), user_id=user.id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid order id")
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    return ApiResponse(data=OrderOut.model_validate(order).model_dump(mode="json"))


@router.post("/{order_id}/cancel", response_model=ApiResponse[OrderOut])
async def cancel_order(order_id: str, payload: CancelOrderRequest, db: SessionDep, user: CurrentUser):
    try:
        order = await OrderService.get_order(db, uuid.UUID(order_id), user_id=user.id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid order id")
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    try:
        order = await OrderService.cancel(db, order, user_id=user.id)
    except ValidationError as exc:
        raise _err(exc)
    return ApiResponse(data=OrderOut.model_validate(order).model_dump(mode="json"), message="Order cancelled.")


@router.post("/{order_id}/refund", response_model=ApiResponse[PaymentOut])
async def request_refund(order_id: str, db: SessionDep, user: CurrentUser):
    try:
        order = await OrderService.get_order(db, uuid.UUID(order_id), user_id=user.id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid order id")
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    try:
        payment = await OrderService.request_refund(db, order)
    except ValidationError as exc:
        raise _err(exc)
    return ApiResponse(data=PaymentOut.model_validate(payment).model_dump(mode="json"), message="Refund processed.")


@router.post("/{order_id}/confirm-delivery", response_model=ApiResponse[OrderOut])
async def confirm_delivery(order_id: str, payload: ConfirmDeliveryRequest, db: SessionDep, user: CurrentUser):
    try:
        order = await OrderService.get_order(db, uuid.UUID(order_id), user_id=user.id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid order id")
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    try:
        order = await OrderService.confirm_delivery(db, order, otp_code=payload.otp_code)
    except ValidationError as exc:
        raise _err(exc)
    return ApiResponse(data=OrderOut.model_validate(order).model_dump(mode="json"), message="Delivery confirmed.")


@router.get("/{order_id}/settlement", response_model=ApiResponse[SettlementOut])
async def get_settlement(order_id: str, db: SessionDep, user: CurrentUser):
    order = (await db.execute(
        select(Order).where(Order.id == uuid.UUID(order_id))
    )).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.user_id != user.id and user.role not in ("admin",):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not permitted")
    settlement = order.settlement
    if settlement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No settlement for this order")
    return ApiResponse(data=SettlementOut.model_validate(settlement).model_dump(mode="json"))
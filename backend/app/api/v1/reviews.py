"""Product review API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, OptionalUser, SessionDep, require_producer
from app.models.farmer import FarmerProfile
from app.models.order import Order, OrderItem
from app.models.review import Review
from app.schemas.common import ApiResponse
from app.utils.validators import ValidationError, validate_rating

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    product_listing_id: str
    order_id: str | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class FarmerResponse(BaseModel):
    comment: str


def _review_dict(r: Review) -> dict:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "product_listing_id": str(r.product_listing_id),
        "order_id": str(r.order_id) if r.order_id else None,
        "rating": r.rating,
        "comment": r.comment,
        "farmer_response": r.farmer_response,
        "is_verified_purchase": r.is_verified_purchase,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


async def _verify_purchase(db, user_id: uuid.UUID, listing_id: uuid.UUID) -> bool:
    orders = (
        await db.execute(select(Order.id).where(Order.user_id == user_id))
    ).scalars().all()
    if not orders:
        return False
    match = (
        await db.execute(
            select(OrderItem.id).where(
                OrderItem.order_id.in_(list(orders)),
                OrderItem.product_listing_id == listing_id,
            )
        )
    ).scalars().first()
    return match is not None


@router.post("/", response_model=ApiResponse[dict])
async def create_review(payload: ReviewCreate, db: SessionDep, user: CurrentUser):
    try:
        validate_rating(payload.rating)
        listing_id = uuid.UUID(payload.product_listing_id)
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))

    existing = (
        await db.execute(
            select(Review).where(
                Review.user_id == user.id,
                Review.product_listing_id == listing_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You already reviewed this listing.")

    review = Review(
        user_id=user.id,
        product_listing_id=listing_id,
        order_id=uuid.UUID(payload.order_id) if payload.order_id else None,
        rating=payload.rating,
        comment=payload.comment,
        is_verified_purchase=await _verify_purchase(db, user.id, listing_id),
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return ApiResponse(data=_review_dict(review), message="Review posted.")


@router.get("/", response_model=ApiResponse[list[dict]])
async def list_reviews(
    db: SessionDep,
    product_listing_id: str | None = Query(default=None),
    user: OptionalUser = None,
):
    stmt = select(Review).order_by(Review.created_at.desc())
    if product_listing_id:
        stmt = stmt.where(Review.product_listing_id == uuid.UUID(product_listing_id))
    rows = (await db.execute(stmt)).scalars().unique().all()
    return ApiResponse(data=[_review_dict(r) for r in rows])


@router.post("/{review_id}/respond", response_model=ApiResponse[dict], dependencies=[require_producer])
async def respond_to_review(review_id: str, payload: FarmerResponse, db: SessionDep, user: CurrentUser):
    review = (await db.execute(select(Review).where(Review.id == uuid.UUID(review_id)))).scalar_one_or_none()
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Review not found")

    listing = (
        await db.execute(select(OrderItem.product_listing_id).where(
            OrderItem.product_listing_id == review.product_listing_id
        ))
    ).scalar_one_or_none()

    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the producer can respond.")

    review.farmer_response = payload.comment
    await db.commit()
    await db.refresh(review)
    return ApiResponse(data=_review_dict(review), message="Response posted.")
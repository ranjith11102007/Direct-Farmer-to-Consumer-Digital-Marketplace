"""Product and category API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import (
    CurrentUser,
    OptionalUser,
    RateLimitDefault,
    SessionDep,
    require_farmer,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.product import (
    CategoryCreate,
    CategoryOut,
    ListingCreate,
    ListingOut,
    ListingUpdate,
    NearbyParams,
    ProductCreate,
    ProductOut,
    SearchParams,
)
from app.services.product import ProductService
from app.models.user import UserRole
from app.utils.validators import ValidationError

router = APIRouter(prefix="/products", tags=["Products"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


# ---------- Categories ----------

@router.get("/categories", response_model=ApiResponse[list[CategoryOut]])
async def list_categories(db: SessionDep):
    categories = await ProductService.list_categories(db)
    return ApiResponse(data=json_items(categories), message="Categories.")


@router.post("/categories", response_model=ApiResponse[CategoryOut], dependencies=[require_farmer])
async def create_category(payload: CategoryCreate, db: SessionDep, user: CurrentUser):
    try:
        parent_id = uuid.UUID(payload.parent_id) if payload.parent_id else None
        category = await ProductService.create_category(
            db,
            name=payload.name,
            slug=payload.slug,
            name_tamil=payload.name_tamil,
            icon=payload.icon,
            parent_id=parent_id,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
        )
    except ValidationError as exc:
        raise _err(exc)
    return ApiResponse(data=CategoryOut.model_validate(category).model_dump(mode="json"))


# ---------- Products ----------

@router.post("/", response_model=ApiResponse[ProductOut])
async def create_product(payload: ProductCreate, db: SessionDep):
    try:
        product = await ProductService.create_product(
            db,
            name=payload.name,
            name_tamil=payload.name_tamil,
            category_id=uuid.UUID(payload.category_id),
            description=payload.description,
            image_url=payload.image_url,
            unit=payload.unit,
        )
    except Exception as exc:
        raise _err(exc)
    return ApiResponse(data=ProductOut.model_validate(product).model_dump(mode="json"))


# ---------- Listings ----------

@router.post("/listings", response_model=ApiResponse[ListingOut], dependencies=[require_farmer])
async def create_listing(payload: ListingCreate, db: SessionDep, user: CurrentUser):
    from app.models.farmer import FarmerProfile
    from sqlalchemy import select

    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create a farmer profile first.")

    try:
        listing = await ProductService.create_listing(
            db,
            producer_id=profile.id,
            product_id=uuid.UUID(payload.product_id),
            price_per_unit=payload.price_per_unit,
            available_quantity=payload.available_quantity,
            wholesale_price=payload.wholesale_price,
            grade=payload.grade,
            min_order_quantity=payload.min_order_quantity,
            harvest_date=payload.harvest_date,
            packing_date=payload.packing_date,
            expiry_date=payload.expiry_date,
            collection_center_id=uuid.UUID(payload.collection_center_id) if payload.collection_center_id else None,
            organic_certified=payload.organic_certified,
            certification_doc_url=payload.certification_doc_url,
            location_district=payload.location_district,
            location_state=payload.location_state,
            producer_type=payload.producer_type,
            status=payload.status,
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=ListingOut.model_validate(listing).model_dump(mode="json"), message="Listing created.")


@router.put("/listings/{listing_id}", response_model=ApiResponse[ListingOut])
async def update_listing(listing_id: str, payload: ListingUpdate, db: SessionDep, user: CurrentUser):
    from app.models.farmer import FarmerProfile
    from sqlalchemy import select

    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    try:
        listing = await ProductService.update_listing(
            db,
            uuid.UUID(listing_id),
            producer_id=profile.id if profile else None,
            **payload.model_dump(exclude_none=True),
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)
    return ApiResponse(data=ListingOut.model_validate(listing).model_dump(mode="json"), message="Listing updated.")


@router.get("/listings/{listing_id}", response_model=ApiResponse[ListingOut])
async def get_listing(listing_id: str, db: SessionDep):
    try:
        listing = await ProductService.get_listing(db, uuid.UUID(listing_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid listing id")
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return ApiResponse(data=ListingOut.model_validate(listing).model_dump(mode="json"))


# ---------- Search & discovery ----------

@router.get("/search", response_model=PaginatedResponse[ListingOut])
async def search(
    db: SessionDep,
    q: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    district: str | None = Query(default=None),
    state: str | None = Query(default=None),
    min_price: float | None = Query(default=None),
    max_price: float | None = Query(default=None),
    organic_only: bool = Query(default=False),
    producer_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _rate: None = RateLimitDefault,
):
    from app.services.search import SearchService

    try:
        cat_uuid = uuid.UUID(category_id) if category_id else None
        result = await SearchService.search_listings(
            db,
            query=q,
            category_id=str(cat_uuid) if cat_uuid else None,
            district=district,
            min_price=min_price,
            max_price=max_price,
            organic_only=organic_only,
            producer_type=producer_type,
            page=page,
            page_size=page_size,
        )
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid category id")
    return serialize_paged(result)


@router.get("/nearby", response_model=PaginatedResponse[ListingOut])
async def nearby(
    db: SessionDep,
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=50, ge=1, le=500),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await ProductService.get_nearby(
        db, lat=lat, lng=lng, radius_km=radius_km, page=page, page_size=page_size
    )
    return serialize_paged(result)


@router.get("/recommendations", response_model=ApiResponse[list[dict]])
async def recommendations(
    db: SessionDep,
    user: OptionalUser,
    district: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
):
    listings = await ProductService.get_recommendations(
        db,
        user=user,
        district=district,
        limit=limit,
    )
    return ApiResponse(
        data=[
            ListingOut.model_validate(l).model_dump(mode="json") | {"product": None}
            for l in listings
        ],
        message="Recommendations.",
    )


# ---------- Helpers ----------

@router.get("/{product_id}", response_model=ApiResponse[ProductOut])
async def get_product(product_id: str, db: SessionDep):
    try:
        product = await ProductService.get_product(db, uuid.UUID(product_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid product id")
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ApiResponse(data=ProductOut.model_validate(product).model_dump(mode="json"))


def json_items(items: list) -> list[dict]:
    return [CategoryOut.model_validate(i).model_dump(mode="json") for i in items]


def serialize_paged(result: dict) -> PaginatedResponse[ListingOut]:
    items = [ListingOut.model_validate(i).model_dump(mode="json") for i in result["items"]]
    return PaginatedResponse[ListingOut](
        items=items,
        page=result["page"],
        page_size=result["page_size"],
        total=result["total"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_prev=result["has_prev"],
    )
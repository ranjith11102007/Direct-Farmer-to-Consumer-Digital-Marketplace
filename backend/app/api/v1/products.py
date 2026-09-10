"""Product and category API routes."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import (
    CurrentUser,
    OptionalUser,
    RateLimitDefault,
    SessionDep,
    require_farmer,
)
from app.models.farmer import FarmerProfile
from app.models.product import (
    Category,
    ListingStatus,
    Product,
    ProductListing,
    ProductUnit,
    ProducerType,
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
    ProductUpdate,
    SearchParams,
)
from app.services.product import ProductService
from app.utils.helpers import paginate_query
from app.utils.validators import ValidationError

router = APIRouter(prefix="/products", tags=["Products"])


# Frontend category slugs (ProductCategory union) -> backend category slugs.
_FRONTEND_TO_BACKEND_SLUG: dict[str, str] = {
    "vegetables": "vegetables",
    "fruits": "fruits",
    "grains": "grains-and-millets",
    "pulses": "pulses-and-lentils",
    "spices": "spices",
    "oilseeds": "oilseeds",
    "dairy": "dairy-and-eggs",
    "organic": "organic-products",
    "processed": "processed-foods",
    "seeds": "seeds-and-farm-inputs",
    "bulk": "bulk-procurement",
    "seasonal": "seasonal-products",
}
_BACKEND_TO_FRONTEND_SLUG = {v: k for k, v in _FRONTEND_TO_BACKEND_SLUG.items()}

# Listing status -> frontend product.status (pending/approved/rejected/archived).
_STATUS_FRONTEND: dict[str, str] = {
    ListingStatus.DRAFT.value: "pending",
    ListingStatus.ACTIVE.value: "approved",
    ListingStatus.PAUSED.value: "archived",
    ListingStatus.EXPIRED.value: "archived",
    ListingStatus.SOLD_OUT.value: "archived",
}


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


def _frontend_category(slug: str) -> str:
    return _BACKEND_TO_FRONTEND_SLUG.get(slug, slug)


async def _resolve_category_row(db: SessionDep, key: str | None) -> Category | None:
    """Resolve a frontend category slug (or backend slug) to a Category row."""
    if not key:
        return None
    slug = _FRONTEND_TO_BACKEND_SLUG.get(key, key)
    return (
        await db.execute(select(Category).where(Category.slug == slug, Category.is_active.is_(True)))
    ).scalar_one_or_none()


def _listing_stmt() -> select[ProductListing]:
    return (
        select(ProductListing)
        .options(
            selectinload(ProductListing.product).selectinload(Product.category),
            selectinload(ProductListing.producer).selectinload(FarmerProfile.user),
        )
        .join(Product, ProductListing.product_id == Product.id)
        .join(Category, Product.category_id == Category.id)
    )


def _stock_status(available_quantity: float) -> str:
    if available_quantity <= 0:
        return "out_of_stock"
    if available_quantity < 20:
        return "low_stock"
    return "in_stock"


def _frontend_product(listing: ProductListing) -> dict:
    """Serialize a listing into the frontend Product (camelCase) shape."""
    product = listing.product
    category = product.category if product else None
    producer = listing.producer
    user = producer.user if producer else None

    harvest = listing.harvest_date
    shelf = listing.expiry_date and harvest
    shelf_days = (listing.expiry_date - harvest).days if shelf else 5

    district = listing.location_district or (producer.district if producer else None)
    state = listing.location_state or (producer.state if producer else None)

    return {
        "id": str(listing.id),
        "categoryId": str(category.id) if category else "",
        "category": _frontend_category(category.slug) if category else "vegetables",
        "name": product.name if product else "",
        "nameTa": product.name_tamil if product else "",
        "description": product.description if product and product.description else "",
        "images": [product.image_url] if product and product.image_url else [],
        "unit": product.unit.value if product else "kg",
        "basePricePerUnit": float(listing.wholesale_price or listing.price_per_unit),
        "currentPricePerUnit": float(listing.price_per_unit),
        "minOrderQuantity": float(listing.min_order_quantity or 1),
        "availableQuantity": float(listing.available_quantity or 0),
        "farmerId": str(user.id) if user else "",
        "producer": {
            "id": str(producer.id) if producer else "",
            "name": (producer.farm_name if producer else None) or (user.full_name if user else ""),
            "entityType": listing.producer_type.value if listing.producer_type else "farmer",
        },
        "sourceLocation": {
            "district": district or "",
            "state": state or "",
            "village": producer.farm_address if producer else None,
        },
        "grade": listing.grade or "A",
        "packagingType": "loose",
        "harvestDate": harvest.isoformat() if harvest else "",
        "shelfLifeDays": shelf_days,
        "deliveryEstimateMins": 0,
        "isOrganic": bool(listing.organic_certified),
        "isOrganicCertified": bool(listing.organic_certified),
        "certifications": ["Organic"] if listing.organic_certified else [],
        "stockStatus": _stock_status(float(listing.available_quantity or 0)),
        "status": _STATUS_FRONTEND.get(listing.status.value if listing.status else "", "pending"),
        "avgRating": float(producer.rating or 0) if producer else 0,
        "totalRatings": 0,
        "tags": [],
        "createdAt": listing.created_at.isoformat() if listing.created_at else "",
        "updatedAt": listing.updated_at.isoformat() if listing.updated_at else "",
    }


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


# ---------- List ----------

@router.get("")
async def list_products(
    db: SessionDep,
    user: OptionalUser,
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=12, ge=1, le=100),
    organic: bool = Query(default=False),
    organic_only: bool = Query(default=False),
    price_min: float | None = Query(default=None),
    price_max: float | None = Query(default=None),
    producer_type: str | None = Query(default=None),
    grades: str | None = Query(default=None),
    harvest_within_days: int | None = Query(default=None),
    mine: bool = Query(default=False),
    nearby: bool = Query(default=False),
    featured: bool = Query(default=False),
):
    """Product listing for marketplace and producer dashboard.

    Returns the frontend-product (camelCase) shape, unwrapped:
    {"items": [...], "total": n, "page": n, "perPage": n, "totalPages": n}
    """
    stmt = _listing_stmt()

    if mine:
        profile = (
            await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
            if user
            else None
        )
        if user and profile:
            profile = profile.scalar_one_or_none()
        if not user or not profile:
            return {
                "items": [],
                "total": 0,
                "page": page,
                "perPage": per_page,
                "totalPages": 0,
            }
        stmt = stmt.where(ProductListing.producer_id == profile.id)
        stmt = stmt.where(ProductListing.status != ListingStatus.EXPIRED)
    else:
        stmt = stmt.where(
            ProductListing.status == ListingStatus.ACTIVE,
            ProductListing.available_quantity > 0,
        )

    where_clauses: list[object] = []

    if q:
        like = f"%{q.strip()}%"
        where_clauses.append(
            or_(
                Product.name.ilike(like),
                Product.name_tamil.ilike(like),
                Product.description.ilike(like),
                Category.name.ilike(like),
            )
        )
    cat_row = await _resolve_category_row(db, category)
    if cat_row is not None:
        where_clauses.append(Product.category_id == cat_row.id)
    elif category_id:
        try:
            where_clauses.append(Product.category_id == uuid.UUID(category_id))
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid category id")

    if organic or organic_only:
        where_clauses.append(ProductListing.organic_certified.is_(True))
    if price_min is not None:
        where_clauses.append(ProductListing.price_per_unit >= float(price_min))
    if price_max is not None:
        where_clauses.append(ProductListing.price_per_unit <= float(price_max))
    if producer_type:
        try:
            where_clauses.append(
                ProductListing.producer_type == ProducerType(producer_type)
            )
        except ValueError:
            where_clauses.append(ProductListing.producer_type == producer_type)
    if grades:
        grade_list = [g.strip() for g in grades.split(",") if g.strip()]
        if grade_list:
            where_clauses.append(ProductListing.grade.in_(grade_list))
    if harvest_within_days:
        cutoff = datetime.now(timezone.utc).date() - timedelta(days=harvest_within_days)
        where_clauses.append(
            ProductListing.harvest_date.is_not(None),
            ProductListing.harvest_date >= cutoff,
        )

    if where_clauses:
        stmt = stmt.where(and_(*where_clauses))

    stmt = stmt.order_by(ProductListing.organic_certified.desc(), ProductListing.created_at.desc())

    try:
        result = await paginate_query(db, stmt, page=page, page_size=per_page)
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")

    items = [_frontend_product(l) for l in result["items"]]
    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "perPage": result["page_size"],
        "totalPages": result["total_pages"],
    }


# ---------- Products ----------

@router.post("", response_model=ApiResponse[ProductOut], dependencies=[require_farmer], include_in_schema=True)
async def create_product(payload: ProductCreate, db: SessionDep, user: CurrentUser):
    try:
        category_id = uuid.UUID(payload.category_id) if payload.category_id else None
        if category_id is None:
            cat = await _resolve_category_row(db, payload.category_slug)
            if cat is None:
                raise ValidationError("Category not found. Provide category_id or category_slug.")
            category_id = cat.id
        unit = ProductUnit(payload.unit) if payload.unit else ProductUnit.KG
        product = await ProductService.create_product(
            db,
            name=payload.name,
            name_tamil=payload.name_tamil,
            category_id=category_id,
            description=payload.description,
            image_url=payload.image_url,
            unit=unit,
        )
    except (Exception) as exc:
        raise _err(exc)
    return ApiResponse(data=ProductOut.model_validate(product).model_dump(mode="json"))


# ---------- Listings ----------

@router.post("/listings", response_model=ApiResponse[ListingOut], dependencies=[require_farmer])
async def create_listing(payload: ListingCreate, db: SessionDep, user: CurrentUser):
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


@router.get("/listings/{listing_id}", response_model=ApiResponse[ListingOut])
async def get_listing(listing_id: str, user: OptionalUser, db: SessionDep):
    try:
        listing = await ProductService.get_listing(db, uuid.UUID(listing_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid listing id")
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return ApiResponse(data=ListingOut.model_validate(listing).model_dump(mode="json"))


# ---------- Search & discovery ----------

@router.get("/search")
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

    items = [_frontend_product(l) for l in result["items"]]
    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "perPage": result["page_size"],
        "totalPages": result["total_pages"],
    }


@router.get("/nearby")
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

    items = [_frontend_product(l) for l in result["items"]]
    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "perPage": result["page_size"],
        "totalPages": result["total_pages"],
    }


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


# ---------- Detail / Update / Delete ----------

@router.get("/{product_id}")
async def get_product(product_id: str, db: SessionDep):
    """Single product detail in the frontend shape:
    {"product": {...}, "recommendations": [], "reviews": []}
    """
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid product id")

    listing = (
        await db.execute(_listing_stmt().where(ProductListing.id == pid))
    ).scalar_one_or_none()

    if listing is None:
        # Fallback: by product id (return its latest active listing if any).
        product = (await db.execute(select(Product).where(Product.id == pid))).scalar_one_or_none()
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
        listing = (
            await db.execute(
                _listing_stmt()
                .where(Product.id == pid, ProductListing.status == ListingStatus.ACTIVE)
                .order_by(ProductListing.created_at.desc())
                .limit(1)
            )
        ).scalars().first()

    if listing is None:
        # Product exists but has no active listing; return empty product detail.
        product = (await db.execute(select(Product).where(Product.id == pid))).scalar_one_or_none()
        if product is not None:
            payload = _frontend_product(_placeholder_listing(product))
            return {
                "product": payload,
                "recommendations": [],
                "reviews": [],
            }
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return {
        "product": _frontend_product(listing),
        "recommendations": [],
        "reviews": [],
    }


@router.put("/{product_id}", response_model=ApiResponse[ListingOut], dependencies=[require_farmer])
async def update_product(product_id: str, payload: ProductUpdate, db: SessionDep, user: CurrentUser):
    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create a farmer profile first.")

    try:
        listing = await ProductService.update_listing(
            db,
            uuid.UUID(product_id),
            producer_id=profile.id,
            **payload.model_dump(exclude_none=True),
        )
    except (ValidationError, ValueError) as exc:
        raise _err(exc)

    product = listing.product
    data = payload.model_dump(exclude_none=True)
    if data.get("name") is not None or data.get("name_tamil") is not None or data.get("description") is not None or data.get("unit") is not None:
        if data.get("name") is not None:
            product.name = data["name"]
        if data.get("name_tamil") is not None:
            product.name_tamil = data["name_tamil"]
        if data.get("description") is not None:
            product.description = data["description"]
        if data.get("unit") is not None:
            product.unit = ProductUnit(data["unit"])
        await db.commit()
        await db.refresh(product)

    return ApiResponse(data=ListingOut.model_validate(listing).model_dump(mode="json"), message="Listing updated.")


@router.delete("/{product_id}", response_model=ApiResponse[dict], dependencies=[require_farmer])
async def delete_product(product_id: str, db: SessionDep, user: CurrentUser):
    profile = (
        await db.execute(select(FarmerProfile).where(FarmerProfile.user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create a farmer profile first.")

    try:
        listing = (
            await db.execute(
                select(ProductListing).where(ProductListing.id == uuid.UUID(product_id))
            )
        ).scalar_one_or_none()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid product id")
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if str(listing.producer_id) != str(profile.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this listing.")

    await db.delete(listing)
    await db.flush()

    remaining = (
        await db.execute(
            select(ProductListing.id).where(ProductListing.product_id == listing.product_id).limit(1)
        )
    ).scalars().first()
    if remaining is None:
        product = (await db.execute(select(Product).where(Product.id == listing.product_id))).scalar_one_or_none()
        if product is not None:
            await db.delete(product)

    await db.commit()
    return ApiResponse(data={"id": product_id}, message="Listing deleted.")


# ---------- Helpers ----------

def _placeholder_listing(product: Product) -> ProductListing:
    """A lightweight, unsaved listing used only for serialization of a product
    that has no active listing yet."""
    listing = ProductListing(
        product_id=product.id,
        producer_id=uuid.uuid4(),
        price_per_unit=0,
        available_quantity=0,
        grade="A",
    )
    listing.product = product
    listing.status = ListingStatus.ACTIVE
    return listing


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
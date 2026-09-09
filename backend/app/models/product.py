"""Product models: Category, Product, Translation, Listing."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from app.models.types import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ProductUnit(str, enum.Enum):
    KG = "kg"
    G = "g"
    LITRE = "litre"
    DOZEN = "dozen"
    PIECE = "piece"
    PACKET = "packet"
    BUNDLE = "bundle"


class ListingStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    SOLD_OUT = "sold_out"


class ProducerType(str, enum.Enum):
    FARMER = "farmer"
    FPO = "fpo"


class Category(BaseModel):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(150), index=True)
    name_tamil: Mapped[str | None] = mapped_column(String(150))
    slug: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    icon: Mapped[str | None] = mapped_column(String(255))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    parent = relationship("Category", remote_side="Category.id", back_populates="children")
    children = relationship(
        "Category",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    products = relationship("Product", back_populates="category")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"


class Product(BaseModel):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), index=True)
    name_tamil: Mapped[str | None] = mapped_column(String(255), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[ProductUnit] = mapped_column(
        Enum(ProductUnit, name="product_unit_enum", native_enum=False),
        default=ProductUnit.KG,
    )

    category = relationship("Category", back_populates="products")
    translations = relationship(
        "ProductTranslation", back_populates="product", cascade="all, delete-orphan"
    )
    listings = relationship(
        "ProductListing", back_populates="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r}>"


class ProductTranslation(BaseModel):
    __tablename__ = "product_translations"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    language: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    product = relationship("Product", back_populates="translations")

    __table_args__ = (Index("ix_product_translation_product_lang", "product_id", "language"),)

    def __repr__(self) -> str:
        return f"<ProductTranslation product={self.product_id} lang={self.language!r}>"


class ProductListing(BaseModel):
    __tablename__ = "product_listings"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    producer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmer_profiles.id", ondelete="CASCADE"), index=True
    )
    producer_type: Mapped[ProducerType] = mapped_column(
        Enum(ProducerType, name="producer_type_enum", native_enum=False),
        default=ProducerType.FARMER,
        index=True,
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), index=True
    )
    price_per_unit: Mapped[float] = mapped_column(Numeric(12, 2))
    wholesale_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    grade: Mapped[str] = mapped_column(String(20), default="A", index=True)
    available_quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0)
    min_order_quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=1)
    harvest_date: Mapped[datetime | None] = mapped_column(Date)
    packing_date: Mapped[datetime | None] = mapped_column(Date)
    expiry_date: Mapped[datetime | None] = mapped_column(Date)
    collection_center_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("collection_centers.id", ondelete="SET NULL"),
        index=True,
    )
    organic_certified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    certification_doc_url: Mapped[str | None] = mapped_column(Text)
    location_district: Mapped[str | None] = mapped_column(String(100), index=True)
    location_state: Mapped[str | None] = mapped_column(String(100), index=True)
    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus, name="listing_status_enum", native_enum=False),
        default=ListingStatus.DRAFT,
        index=True,
    )

    product = relationship("Product", back_populates="listings")
    producer = relationship("FarmerProfile", foreign_keys=[producer_id], back_populates="listings")
    batch = relationship("Batch", foreign_keys=[batch_id], back_populates="listings")
    inventory_entries = relationship(
        "InventoryLedger", back_populates="product_listing", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index(
            "ix_listings_active_location",
            "status",
            "location_district",
            "location_state",
        ),
        Index(
            "ix_listings_product_price",
            "product_id",
            "price_per_unit",
        ),
    )

    def __repr__(self) -> str:
        return f"<ProductListing id={self.id} product={self.product_id} price={self.price_per_unit}>"
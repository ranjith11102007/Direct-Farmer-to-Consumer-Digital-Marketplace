"""Import all ORM models so metadata is complete for Alembic and create_all."""
from app.models.base import BaseModel, IdMixin, TimestampMixin
from app.models.user import User, UserRole, VerificationStatus
from app.models.farmer import FarmerProfile
from app.models.fpo import FPO, FPOMember
from app.models.product import (
    Category,
    Product,
    ProductTranslation,
    ProductListing,
    ProductUnit,
    ListingStatus,
    ProducerType,
)
from app.models.batch import Batch, BatchEvent, BatchStatus, BatchEventType
from app.models.inventory import InventoryLedger, ChangeType
from app.models.order import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment,
    Settlement,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    SettlementStatus,
)
from app.models.delivery import (
    DeliveryPartner,
    Vehicle,
    Delivery,
    Route,
    DeliveryStatus,
    VehicleType,
    RouteStatus,
)
from app.models.location import Address, ServiceArea, CollectionCenter
from app.models.bulk import (
    BulkRequirement,
    Quotation,
    PurchaseOrder,
    ScheduleType,
    RequirementStatus,
    QuotationStatus,
    PurchaseOrderStatus,
)
from app.models.ai import Forecast, ForecastAccuracy, Recommendation
from app.models.notification import Notification, NotificationType, NotificationChannel
from app.models.review import Review
from app.models.audit import AuditLog, ConsentRecord
from app.models.traceability import TraceabilityPassport
from app.models.subscription import Subscription
from app.models.complaint import Complaint
from app.models.crate import ReusableCrate
from app.models.group_order import GroupOrder, GroupOrderParticipant
from app.models.harvest_prebooking import HarvestPrebooking, PrebookingReservation
from app.models.food_loss import FoodLossAlert
from app.models.price_simulator import PriceSimulator
from app.models.sustainability import SustainabilityRecord

from app.database import Base

__all__ = [
    "Base",
    "BaseModel",
    "IdMixin",
    "TimestampMixin",
    "User",
    "UserRole",
    "VerificationStatus",
    "FarmerProfile",
    "FPO",
    "FPOMember",
    "Category",
    "Product",
    "ProductTranslation",
    "ProductListing",
    "ProductUnit",
    "ListingStatus",
    "ProducerType",
    "Batch",
    "BatchEvent",
    "BatchStatus",
    "BatchEventType",
    "InventoryLedger",
    "ChangeType",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
    "Payment",
    "Settlement",
    "OrderStatus",
    "PaymentMethod",
    "PaymentStatus",
    "SettlementStatus",
    "DeliveryPartner",
    "Vehicle",
    "Delivery",
    "Route",
    "DeliveryStatus",
    "VehicleType",
    "RouteStatus",
    "Address",
    "ServiceArea",
    "CollectionCenter",
    "BulkRequirement",
    "Quotation",
    "PurchaseOrder",
    "ScheduleType",
    "RequirementStatus",
    "QuotationStatus",
    "PurchaseOrderStatus",
    "Forecast",
    "ForecastAccuracy",
    "Recommendation",
    "Notification",
    "NotificationType",
    "NotificationChannel",
    "Review",
    "AuditLog",
    "ConsentRecord",
    "TraceabilityPassport",
    "Subscription",
    "Complaint",
    "ReusableCrate",
    "GroupOrder",
    "GroupOrderParticipant",
    "HarvestPrebooking",
    "PrebookingReservation",
    "FoodLossAlert",
    "PriceSimulator",
    "SustainabilityRecord",
]
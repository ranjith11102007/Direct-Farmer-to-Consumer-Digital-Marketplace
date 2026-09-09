"""Seed script for Vaikkal demo environment.

Creates clearly-labelled demo data:
- Admin / farmer / FPO / bulk buyer / delivery partner accounts
- Tamil Nadu service areas & collection centers
- Product categories & products with Tamil names
- Active product listings from verified producers
- Historical orders for AI forecasting
- Sample bulk requirements & quotations
- Forecast records with confidence & model metadata

All records are demo records for a hackathon environment.
"""
from __future__ import annotations

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import init_db, SessionLocal
from app.models import (
    AuditLog,
    Batch,
    BatchEvent,
    BatchEventType,
    BatchStatus,
    BulkRequirement,
    Category,
    CollectionCenter,
    DeliveryPartner,
    FarmerProfile,
    FoodLossAlert,
    Forecast,
    FPO,
    FPOMember,
    InventoryLedger,
    Order,
    OrderStatus,
    Payment,
    Product,
    ProductListing,
    ProductUnit,
    Quotation,
    Recommendation,
    Review,
    ServiceArea,
    Settlement,
    SettlementStatus,
    Subscription,
    User,
    UserRole,
    Vehicle,
    VerificationStatus,
)
from app.models.bulk import RequirementStatus
from app.models.delivery import VehicleType
from app.models.inventory import ChangeType
from app.models.notification import Notification
from app.models.product import ListingStatus, ProducerType
from app.utils.security import hash_password

PASSWORD = "Vaikkal@Demo123"


def _fake_phone(seed: int) -> str:
    return f"98{seed:08d}"


async def create_users(db: AsyncSession) -> dict[str, User]:
    users: list[User] = [
        User(
            email="admin@vaikkal.in",
            phone=_fake_phone(10000000),
            password_hash=hash_password(PASSWORD),
            full_name="Admin Officer",
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="en",
        ),
        User(
            email="farmer1@vaikkal.in",
            phone=_fake_phone(20000001),
            password_hash=hash_password(PASSWORD),
            full_name="Murugan K",
            role=UserRole.FARMER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
        User(
            email="farmer2@vaikkal.in",
            phone=_fake_phone(20000002),
            password_hash=hash_password(PASSWORD),
            full_name="Meenakshi R",
            role=UserRole.FARMER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
        User(
            email="fpo1@vaikkal.in",
            phone=_fake_phone(30000001),
            password_hash=hash_password(PASSWORD),
            full_name="Kongunadu FPO",
            role=UserRole.FPO_ADMIN,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
        User(
            email="buyer-hotel@vaikkal.in",
            phone=_fake_phone(40000001),
            password_hash=hash_password(PASSWORD),
            full_name="Sahana Grand Hotel",
            role=UserRole.BULK_BUYER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="en",
        ),
        User(
            email="buyer-retail@vaikkal.in",
            phone=_fake_phone(40000002),
            password_hash=hash_password(PASSWORD),
            full_name="Verma Fresh Mart",
            role=UserRole.BULK_BUYER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="en",
        ),
        User(
            email="delivery1@vaikkal.in",
            phone=_fake_phone(50000001),
            password_hash=hash_password(PASSWORD),
            full_name="Suresh Driver",
            role=UserRole.DELIVERY_PARTNER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
        User(
            email="consumer1@vaikkal.in",
            phone=_fake_phone(60000001),
            password_hash=hash_password(PASSWORD),
            full_name="Priya S",
            role=UserRole.CONSUMER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
        User(
            email="consumer2@vaikkal.in",
            phone=_fake_phone(60000002),
            password_hash=hash_password(PASSWORD),
            full_name="Arun B",
            role=UserRole.CONSUMER,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="en",
        ),
        User(
            email="operator1@vaikkal.in",
            phone=_fake_phone(70000001),
            password_hash=hash_password(PASSWORD),
            full_name="Kannan P",
            role=UserRole.COLLECTION_CENTER_OPERATOR,
            is_verified=True,
            is_active=True,
            verification_status=VerificationStatus.VERIFIED,
            preferred_language="ta",
        ),
    ]
    db.add_all(users)
    await db.flush()

    # Farmer profiles
    fp1 = FarmerProfile(
        user_id=users[1].id,
        farm_name="Murugan Organic Farm",
        farm_latitude=10.9941,
        farm_longitude=76.9759,
        farm_address="Thondamuthur Road, Near Perur, Coimbatore",
        district="Coimbatore",
        state="Tamil Nadu",
        pincode="641109",
        land_size_acres=4.5,
        crops_grown=["Tomato", "Lady Finger", "Brinjal", "Drumstick"],
        bank_account_number="123456789012",
        bank_ifsc="SBIN0001234",
        bank_name="State Bank of India",
        verification_status=VerificationStatus.VERIFIED.value,
        rating=4.8,
        total_sales=0,
    )
    fp2 = FarmerProfile(
        user_id=users[2].id,
        farm_name="Meenakshi Farm",
        farm_latitude=10.7905,
        farm_longitude=78.7047,
        farm_address="Trichy Road, Manikandam, Trichy",
        district="Tiruchirappalli",
        state="Tamil Nadu",
        pincode="620012",
        land_size_acres=3.0,
        crops_grown=["Brinjal", "Tomato", "Greens", "Banana"],
        bank_account_number="987654321098",
        bank_ifsc="HDFC0005678",
        bank_name="HDFC Bank",
        verification_status=VerificationStatus.VERIFIED.value,
        rating=4.5,
        total_sales=0,
    )
    db.add_all([fp1, fp2])
    await db.flush()

    # FPO
    fpo1 = FPO(
        name="Kongunadu Farmers Producer Company",
        registration_number="U01409TZ2017PTC000001",
        district="Coimbatore",
        state="Tamil Nadu",
        address="FPO Complex, Sathy Road, Coimbatore",
        contact_phone=_fake_phone(30000001),
        contact_email="hello@kongunadufpo.in",
        verification_status=VerificationStatus.VERIFIED.value,
    )
    db.add(fpo1)
    await db.flush()
    db.add(FPOMember(fpo_id=fpo1.id, farmer_id=fp1.id, role_in_fpo="Director"))
    db.add(FPOMember(fpo_id=fpo1.id, farmer_id=fp2.id, role_in_fpo="Member"))

    # Collection centers
    centers = [
        CollectionCenter(
            fpo_id=fpo1.id,
            name="Kongunadu Collection Hub - Thondamuthur",
            address_line="NH-209, Thondamuthur",
            district="Coimbatore",
            state="Tamil Nadu",
            pincode="641109",
            lat=10.9941,
            lng=76.9759,
            has_cold_storage=True,
            capacity_kg=5000,
            operator_id=users[9].id,
            is_active=True,
        ),
        CollectionCenter(
            fpo_id=fpo1.id,
            name="Kongunadu Collection Hub - Sathy Road",
            address_line="Sathy Main Road, Coimbatore",
            district="Coimbatore",
            state="Tamil Nadu",
            pincode="641035",
            lat=11.0217,
            lng=76.9941,
            has_cold_storage=True,
            capacity_kg=8000,
            is_active=True,
        ),
    ]
    db.add_all(centers)
    await db.flush()

    # Delivery partner + vehicle
    dp1 = DeliveryPartner(
        user_id=users[6].id,
        vehicle_type=VehicleType.TRUCK,
        vehicle_number="TN38AE 7788",
        license_number="TN38 20230123456",
        service_areas=["Coimbatore", "Chennai", "Trichy"],
        is_active=True,
        rating=4.6,
    )
    db.add(dp1)
    await db.flush()
    db.add(
        Vehicle(
            partner_id=dp1.id,
            type=VehicleType.TRUCK,
            number="TN38AE 7788",
            capacity_kg=1500,
            cold_chain_capable=True,
            is_active=True,
        )
    )

    # Service areas
    areas = [
        ServiceArea(
            name="Coimbatore City",
            district="Coimbatore",
            state="Tamil Nadu",
            pincode_range={"from": "641001", "to": "641110"},
            is_active=True,
            delivery_fee_base=40.0,
            estimated_delivery_hours=24,
        ),
        ServiceArea(
            name="Chennai Metro",
            district="Chennai",
            state="Tamil Nadu",
            pincode_range={"from": "600001", "to": "600130"},
            is_active=True,
            delivery_fee_base=60.0,
            estimated_delivery_hours=36,
        ),
        ServiceArea(
            name="Trichy City",
            district="Tiruchirappalli",
            state="Tamil Nadu",
            pincode_range={"from": "620001", "to": "620045"},
            is_active=True,
            delivery_fee_base=35.0,
            estimated_delivery_hours=24,
        ),
    ]
    db.add_all(areas)
    await db.flush()

    # Categories
    categories_data = [
        ("Vegetables", "காய்கறிகள்", "vegetables", "carrot"),
        ("Fruits", "பழங்கள்", "fruits", "apple"),
        ("Grains and Millets", "தானியங்கள் மற்றும் சிறுதானியங்கள்", "grains-and-millets", "wheat"),
        ("Pulses and Lentils", "பருப்புகள்", "pulses-and-lentils", "bean"),
        ("Spices", "மசாலா பொருட்கள்", "spices", "flame"),
        ("Oilseeds", "எண்ணெய் வித்துக்கள்", "oilseeds", "sun"),
        ("Dairy and Eggs", "பால் பொருட்கள் மற்றும் முட்டை", "dairy-and-eggs", "egg"),
        ("Organic Products", "இயற்கை விவசாய பொருட்கள்", "organic-products", "leaf"),
        ("Processed Foods", "பதப்படுத்தப்பட்ட உணவுகள்", "processed-foods", "package"),
        ("Seeds and Farm Inputs", "விதைகள் மற்றும் விவசாய உள்ளீடுகள்", "seeds-and-farm-inputs", "seed"),
        ("Bulk Procurement", "மொத்த கொள்முதல்", "bulk-procurement", "truck"),
        ("Seasonal Products", "பருவகால பொருட்கள்", "seasonal-products", "calendar"),
    ]
    categories: dict[str, Category] = {}
    for name, name_ta, slug, icon in categories_data:
        cat = Category(name=name, name_tamil=name_ta, slug=slug, icon=icon, sort_order=len(categories))
        db.add(cat)
        await db.flush()
        categories[name] = cat

    # Products
    products_data = [
        ("Tomato", "தக்காளி", "Vegetables", ProductUnit.KG, "Fresh ripe tomatoes, harvest-grade A"),
        ("Brinjal", "கத்தரிக்காய்", "Vegetables", ProductUnit.KG, "Purple round brinjal from organic farm"),
        ("Lady Finger", "வெண்டைக்காய்", "Vegetables", ProductUnit.KG, "Tender okra, farm fresh"),
        ("Drumstick", "முருங்கைக்காய்", "Vegetables", ProductUnit.BUNDLE, "Green drumstick, high nutrition"),
        ("Banana (Poovan)", "பூவன் வாழைப்பழம்", "Fruits", ProductUnit.DOZEN, "Poovan variety grown in Trichy"),
        ("Country Vegetables", "நாட்டு காய்கறிகள்", "Vegetables", ProductUnit.KG, "Traditional vegetable mix"),
        ("Organic Rice", "இயற்கை அரிசி", "Grains and Millets", ProductUnit.KG, "Single-polish ponni rice, organic certified"),
        ("Varagu Millets", "வரகு", "Grains and Millets", ProductUnit.KG, "Kodo millet, chemical-free"),
        ("Turmeric Powder", "மஞ்சள் தூள்", "Spices", ProductUnit.KG, "Pure Erode turmeric, no additives"),
        ("Siru Dhaniyam", "சீரகம்", "Spices", ProductUnit.KG, "Premium cumin, strong aroma"),
        ("Onion", "வெங்காயம்", "Vegetables", ProductUnit.KG, "Salem red onion, long storage life"),
        ("Green Chilli", "பச்சை மிளகாய்", "Vegetables", ProductUnit.KG, "Hot green chillies, morning harvest"),
        ("Country Eggs", "நாட்டு முட்டை", "Dairy and Eggs", ProductUnit.DOZEN, "Free-range country eggs"),
        ("Fresh Cow Milk", "பசும்பால்", "Dairy and Eggs", ProductUnit.LITRE, "Morning milk, cold-chain handled"),
        ("Coriander Leaves", "கொத்தமல்லி", "Vegetables", ProductUnit.BUNDLE, "Fresh coriander, daily harvest"),
        ("Sweet Potato", "சர்க்கரைவள்ளிக்கிழங்கு", "Vegetables", ProductUnit.KG, "Red sweet potato, Trichy origin"),
    ]
    products: dict[str, Product] = {}
    for name, name_ta, cat_name, unit, desc in products_data:
        prod = Product(
            name=name,
            name_tamil=name_ta,
            category_id=categories[cat_name].id,
            description=desc,
            unit=unit,
        )
        db.add(prod)
        await db.flush()
        products[name] = prod

    # Listings
    now = datetime.now()
    today = now.date()
    listings: list[ProductListing] = []
    listing_map: dict[str, ProductListing] = {}

    async def make_listing(
        key: str,
        prod: Product,
        producer: FarmerProfile,
        price: float,
        qty: float,
        min_qty: float,
        district: str,
        grade: str = "A",
        organic: bool = False,
        center=None,
    ):
        listing = ProductListing(
            product_id=prod.id,
            producer_id=producer.id,
            producer_type=ProducerType.FARMER,
            price_per_unit=Decimal(str(price)),
            wholesale_price=Decimal(str(round(price * 0.85, 2))),
            grade=grade,
            available_quantity=Decimal(str(qty)),
            min_order_quantity=Decimal(str(min_qty)),
            harvest_date=today - timedelta(days=1),
            packing_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=5),
            collection_center_id=center,
            organic_certified=organic,
            certification_doc_url="/uploads/demo/organic-cert.pdf" if organic else None,
            location_district=district,
            location_state="Tamil Nadu",
            status=ListingStatus.ACTIVE,
        )
        db.add(listing)
        await db.flush()
        listings.append(listing)
        listing_map[key] = listing

    await make_listing("tomato_m", products["Tomato"], fp1, 32, 250, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("tomato_mk", products["Tomato"], fp2, 30, 180, 1, "Tiruchirappalli", center=centers[1].id)
    await make_listing("brinjal_m", products["Brinjal"], fp1, 45, 120, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("brinjal_mk", products["Brinjal"], fp2, 40, 90, 1, "Tiruchirappalli", center=centers[1].id)
    await make_listing("ladyfinger_m", products["Lady Finger"], fp1, 38, 100, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("drumstick_m", products["Drumstick"], fp1, 25, 60, 6, "Coimbatore", center=centers[0].id)
    await make_listing("banana_mk", products["Banana (Poovan)"], fp2, 55, 200, 1, "Tiruchirappalli", center=centers[1].id)
    await make_listing("countryveg_mk", products["Country Vegetables"], fp2, 50, 150, 1, "Tiruchirappalli", center=centers[1].id)
    await make_listing("rice_fpo", products["Organic Rice"], fp1, 85, 2000, 5, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("varagu_m", products["Varagu Millets"], fp1, 95, 500, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("turmeric_m", products["Turmeric Powder"], fp1, 165, 200, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("sirudhaniyam_m", products["Siru Dhaniyam"], fp1, 320, 80, 1, "Coimbatore", organic=True, center=centers[0].id)
    await make_listing("onion_mk", products["Onion"], fp2, 42, 600, 5, "Tiruchirappalli", center=centers[1].id)
    await make_listing("chilli_mk", products["Green Chilli"], fp2, 28, 60, 1, "Tiruchirappalli", center=centers[1].id)
    await make_listing("eggs_fpo", products["Country Eggs"], fp1, 7, 500, 12, "Coimbatore", center=centers[0].id)
    await db.flush()

    # Batches + inventory ledger for traceability
    for key, listing in listing_map.items():
        batch_number = f"BK-DEMO-{now.strftime('%Y%m%d')}-{listing.product.name[:3].upper()}-{random.randint(1000, 9999)}"
        batch = Batch(
            batch_number=batch_number,
            product_id=listing.product_id,
            producer_ids=[str(listing.producer_id)],
            fpo_id=fpo1.id,
            collection_center_id=listing.collection_center_id,
            grade=listing.grade,
            quantity_received=float(listing.available_quantity),
            quantity_accepted=float(listing.available_quantity),
            quantity_rejected=0,
            weight_after_packing=float(listing.available_quantity),
            harvest_date=listing.harvest_date,
            packing_date=listing.packing_date,
            status=BatchStatus.PACKED,
        )
        db.add(batch)
        await db.flush()
        listing.batch_id = batch.id
        db.add(
            BatchEvent(
                batch_id=batch.id,
                event_type=BatchEventType.CREATED,
                actor_id=users[0].id,
                notes="Batch created at collection center (demo seed)",
                metadata_json={"source": "seed"},
                timestamp=now - timedelta(days=1),
            )
        )
        db.add(
            BatchEvent(
                batch_id=batch.id,
                event_type=BatchEventType.INSPECTED,
                actor_id=users[9].id,
                notes="Quality check passed. Grade A confirmed.",
                metadata_json={"inspector": "operator1", "grade": "A"},
                timestamp=now - timedelta(days=1, hours=-1),
            )
        )
        db.add(
            InventoryLedger(
                product_listing_id=listing.id,
                batch_id=batch.id,
                change_type=ChangeType.RECEIVED,
                quantity_change=float(listing.available_quantity),
                quantity_after=float(listing.available_quantity),
                reference_type="seeded_batch",
                notes="Demo seed batch - quantity received at collection center",
                created_by=users[0].id,
            )
        )
        db.add(
            Subscription(
                user_id=users[7].id,
                product_listing_id=listing.id,
                schedule_type="weekly",
                quantity=1,
                delivery_address_json={"district": "Coimbatore", "state": "Tamil Nadu", "pincode": "641001"},
                delivery_slot={"preference": "morning", "slot": "7am-10am"},
                is_active=False,
            )
        )

    await db.flush()

    # Historical orders (~90 days) for forecasting
    consumers = [users[7], users[8]]
    for day in range(92, 0, -2):
        for listing in random.sample(listings, k=min(4, len(listings))):
            qty = random.choice([1, 1, 2, 2, 3, 5, 10])
            price = float(listing.price_per_unit)
            subtotal = round(qty * price, 2)
            delivery = 40.0
            packaging = 5.0
            fee = round(subtotal * 0.02, 2)
            tax = round(subtotal * 0.05, 2)
            total = round(subtotal + delivery + packaging + fee + tax, 2)
            user = random.choice(consumers)
            created = now - timedelta(days=day, hours=random.randint(0, 10))
            order = Order(
                user_id=user.id,
                order_number=f"VK-DEMO-{created.strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
                status=OrderStatus.DELIVERED,
                subtotal=Decimal(str(subtotal)),
                delivery_charge=Decimal(str(delivery)),
                packaging_charge=Decimal(str(packaging)),
                platform_fee=Decimal(str(fee)),
                tax=Decimal(str(tax)),
                discount=Decimal("0"),
                total=Decimal(str(total)),
                farmer_share_estimate=Decimal(str(round(subtotal * 0.82, 2))),
                delivery_address_json={"district": listing.location_district, "state": "Tamil Nadu"},
                delivery_slot_start=created + timedelta(days=1),
                delivery_slot_end=created + timedelta(days=1, hours=4),
                created_at=created,
                updated_at=created + timedelta(days=1),
            )
            db.add(order)
            await db.flush()
            db.add(
                Payment(
                    order_id=order.id,
                    amount=Decimal(str(total)),
                    method="upi",
                    provider="demo_upi_provider",
                    provider_reference=f"DEMO-PAY-{uuid.uuid4().hex[:12]}",
                    status="completed",
                    paid_at=created,
                    created_at=created,
                )
            )
            db.add(
                Settlement(
                    order_id=order.id,
                    farmer_id=listing.producer_id,
                    amount=Decimal(str(round(subtotal * 0.82, 2))),
                    platform_fee=Decimal(str(fee)),
                    logistics_deduction=Decimal(str(delivery)),
                    net_settlement=Decimal(str(round(subtotal * 0.82 - fee - delivery, 2))),
                    status=SettlementStatus.SETTLED,
                    settled_at=created + timedelta(days=3),
                    created_at=created + timedelta(days=1),
                )
            )
            db.add(
                Review(
                    user_id=user.id,
                    product_listing_id=listing.id,
                    order_id=order.id,
                    rating=random.randint(4, 5),
                    comment="Fresh produce, delivery on time." if random.random() > 0.3 else "Good quality, packed well.",
                    is_verified_purchase=True,
                    created_at=created + timedelta(days=2),
                )
            )
    await db.flush()

    # Recent live orders (pending / confirmed / dispatched)
    for i in range(3):
        listing = random.choice(listings)
        qty = random.choice([1, 2, 3])
        subtotal = round(float(listing.price_per_unit) * qty, 2)
        total = round(subtotal + 40 + 5, 2)
        user = consumers[i % 2]
        order = Order(
            user_id=user.id,
            order_number=f"VK-LIVE-{now.strftime('%Y%m%d')}-{1000 + i}",
            status=[OrderStatus.CONFIRMED, OrderStatus.DISPATCHED, OrderStatus.OUT_FOR_DELIVERY][i],
            subtotal=Decimal(str(subtotal)),
            delivery_charge=Decimal("40.00"),
            packaging_charge=Decimal("5.00"),
            platform_fee=Decimal("0"),
            tax=Decimal(str(round(subtotal * 0.05, 2))),
            discount=Decimal("0"),
            total=Decimal(str(total)),
            farmer_share_estimate=Decimal(str(round(subtotal * 0.82, 2))),
            delivery_address_json={"district": "Coimbatore", "state": "Tamil Nadu"},
            delivery_slot_start=now + timedelta(days=1),
            delivery_slot_end=now + timedelta(days=1, hours=4),
            created_at=now - timedelta(hours=i * 3),
            updated_at=now - timedelta(hours=i),
        )
        db.add(order)
    await db.flush()

    # Bulk requirement: hotel tomatoes (demo scenario)
    req = BulkRequirement(
        buyer_id=users[4].id,
        product_id=products["Tomato"].id,
        grade="A",
        quantity=Decimal("300"),
        delivery_location_json={"district": "Chennai", "state": "Tamil Nadu", "pincode": "600001"},
        schedule_type="daily",
        target_price=Decimal("28.00"),
        packaging_requirements="10 kg mesh bags, cold chain required",
        quality_specs="Uniform size, deep red, no blemishes, Brix > 4.5",
        deadline=now + timedelta(days=3),
        status=RequirementStatus.OPEN,
        created_at=now - timedelta(days=1),
    )
    db.add(req)
    await db.flush()
    db.add(
        Quotation(
            requirement_id=req.id,
            responder_id=fpo1.id,
            responder_type="fpo",
            price_per_unit=Decimal("26.50"),
            total_price=Decimal("7950.00"),
            delivery_timeline="Daily 5:00 AM from Kongunadu hub",
            quality_notes="Grade A uniform size, cold-chain van",
            valid_until=now + timedelta(days=2),
            status="pending",
            created_at=now - timedelta(hours=20),
        )
    )

    # Forecasts (clearly labelled advisory estimates)
    for name, dist in [
        ("Tomato", "Coimbatore"),
        ("Brinjal", "Coimbatore"),
        ("Onion", "Tiruchirappalli"),
        ("Banana (Poovan)", "Tiruchirappalli"),
    ]:
        product = products[name]
        for period, mult in [("daily", 1.0), ("weekly", 6.2), ("monthly", 26.0)]:
            base = random.randint(40, 200)
            predicted = round(base * mult)
            std = round(predicted * 0.18)
            db.add(
                Forecast(
                    product_id=product.id,
                    district=dist,
                    forecast_date=now + timedelta(days=1),
                    period=period,
                    predicted_demand=float(predicted),
                    confidence_lower=float(predicted - std),
                    confidence_upper=float(predicted + std),
                    factors_json={
                        "peak_factor": 1.1,
                        "harvest_season": True,
                        "reason": f"Historical demand trend for {name} in {dist}",
                        "advisory": True,
                    },
                    model_version="baseline-v1.0",
                    generated_at=now,
                )
            )
    db.add_all([
        Recommendation(
            user_id=users[1].id,
            type="demand_alert",
            title="Demand expected to rise for Tomato",
            title_tamil="தக்காளிக்கான தேவை அதிகரிக்கும் என எதிர்பார்க்கப்படுகிறது",
            message="Demand for Tomatoes in Coimbatore is expected to increase 18% next week. Current stock covers 71% of expected demand. This is an advisory estimate.",
            message_tamil="கோவையில் தக்காளிக்கான தேவை அடுத்த வாரம் 18% அதிகரிக்கும் என எதிர்பார்க்கப்படுகிறது. இது ஒரு ஆலோசனை மதிப்பீடு.",
            data_json={"product": "Tomato", "district": "Coimbatore", "increase_pct": 18},
            confidence=0.78,
            location_district="Coimbatore",
            product_id=products["Tomato"].id,
            expires_at=now + timedelta(days=3),
        ),
        Recommendation(
            user_id=users[1].id,
            type="shortage_risk",
            title="Onion stock above expected demand",
            title_tamil="வெங்காய சேமிப்பு எதிர்பார்த்த தேவையை விட அதிகம்",
            message="Current onion stock in Tiruchirappalli exceeds forecasted demand. Consider reducing harvest deliveries to this location.",
            message_tamil="திருச்சிராப்பள்ளியில் வெங்காயம் சேமிப்பு முன்னறிவிப்பு தேவையை விட அதிகமாக உள்ளது.",
            data_json={"product": "Onion", "district": "Tiruchirappalli"},
            confidence=0.72,
            location_district="Tiruchirappalli",
            product_id=products["Onion"].id,
            expires_at=now + timedelta(days=2),
        ),
        Recommendation(
            user_id=users[1].id,
            type="procurement_plan",
            title="FPO can fulfil 300 kg tomato order",
            title_tamil="போ ஃபோ 300 கிலோ தக்காளி ஆர்டரை நிறைவேற்ற முடியும்",
            message="Kongunadu FPO has aggregate capacity for the daily 300 kg hotel requirement. Suggested collection at Thondamuthur hub by 4:00 AM.",
            message_tamil="கொங்குநாடு எஃப்.பி.ஓ தினசரி 300 கிலோ விருந்தினர் மாளிகை ஆர்டரை நிறைவேற்ற வல்லது.",
            data_json={"fpo": "Kongunadu FPO", "quantity_kg": 300, "collection_center": "Thondamuthur"},
            confidence=0.84,
            location_district="Coimbatore",
            product_id=products["Tomato"].id,
            expires_at=now + timedelta(days=3),
        ),
    ])

    # Notifications
    db.add_all([
        Notification(
            user_id=users[1].id,
            type="forecast",
            title="New demand forecast available",
            title_tamil="புதிய தேவை முன்னறிவிப்பு கிடைக்கிறது",
            message="Daily and weekly demand forecasts for your products have been regenerated.",
            message_tamil="உங்கள் பொருட்களுக்கான தினசரி மற்றும் வாராந்திர தேவை முன்னறிவிப்புகள் புதுப்பிக்கப்பட்டுள்ளன.",
            is_read=False,
            channel="in_app",
        ),
        Notification(
            user_id=users[4].id,
            type="order_update",
            title="New quotation received",
            title_tamil="புதிய விலைப்புள்ளி கிடைத்தது",
            message="Kongunadu FPO has submitted a quotation for your 300kg tomato requirement.",
            message_tamil="கொங்குநாடு எஃப்.பி.ஓ உங்கள் 300 கிலோ தக்காளி தேவைக்கு விலைப்புள்ளி அனுப்பியுள்ளது.",
            is_read=False,
            channel="in_app",
        ),
        Notification(
            user_id=users[6].id,
            type="delivery",
            title="Tomorrow's route is ready",
            title_tamil="நாளைய பயண வழி தயார்",
            message="You have 6 planned stops for tomorrow. Start time 5:30 AM.",
            message_tamil="நாளை உங்களுக்கு 6 திட்டமிடப்பட்ட நிறுத்தங்கள் உள்ளன.",
            is_read=False,
            channel="in_app",
        ),
    ])

    # Audit trail
    db.add_all([
        AuditLog(
            user_id=users[0].id,
            action="seed_demo_data",
            entity_type="system",
            entity_id=uuid.uuid4(),
            new_value_json={"env": "demo", "timestamp": now.isoformat()},
            created_at=now,
        ),
        AuditLog(
            user_id=users[4].id,
            action="bulk_requirement_created",
            entity_type="bulk_requirement",
            entity_id=req.id,
            new_value_json={"product": "Tomato", "quantity": 300, "schedule": "daily"},
            created_at=now - timedelta(days=1),
        ),
    ])

    # Demo food-loss alert
    db.add(
        FoodLossAlert(
            product_listing_id=listing_map["onion_mk"].id,
            batch_id=listing_map["onion_mk"].batch_id,
            alert_type="surplus_predicted",
            severity="medium",
            recommended_actions=[
                "Reduce weekly deliveries to Tiruchirappalli",
                "Offer bulk price to nearby institutions",
                "Divert 40% to processing partner",
            ],
            status="active",
            created_at=now,
            expires_at=now + timedelta(days=4),
        )
    )

    await db.commit()

    return {
        "admin": users[0],
        "farmer1": users[1],
        "farmer2": users[2],
        "fpo": users[3],
        "bulk_buyer": users[4],
        "delivery_partner": users[6],
        "consumer1": users[7],
        "consumer2": users[8],
        "operator": users[9],
    }


async def main() -> None:
    print("Initializing database...")
    await init_db()
    async with SessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(User))
        if existing and existing > 0:
            print(f"Database already has {existing} users. Skipping seed.")
            return
        result = await create_users(db)
        print("Seed complete!")
        print("Demo accounts (password for ALL: Vaikkal@Demo123):")
        for label, user in result.items():
            print(f"  {label}: phone={user.phone}, email={user.email}, role={user.role.value}")
        print()
        print("Environment is DEMO MODE. All records are labelled demo data.")


if __name__ == "__main__":
    asyncio.run(main())
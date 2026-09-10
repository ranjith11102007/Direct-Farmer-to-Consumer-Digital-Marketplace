"""Vaikkal — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.v1 import (
    admin,
    ai_routes,
    auth,
    bulk,
    delivery,
    group_orders,
    harvest_prebooking,
    location,
    notifications,
    orders,
    producer,
    products,
    reviews,
    subscriptions,
    sustainability,
    traceability,
)
from app.database import init_db, ping_database

APP_VERSION = settings.APP_VERSION


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB and Redis; shutdown: clean up."""
    # Try to initialize the database (seed tables in dev; migrations preferred).
    try:
        await init_db()
    except Exception as exc:  # pragma: no cover - infra dependent
        print(f"[startup] DB init skipped: {exc}")

    await ping_database()

    yield

    # Shutdown: close any global redis client.
    import app.services.auth as auth_module

    if auth_module.redis_client is not None:
        try:
            await auth_module.redis_client.aclose()
        except Exception:
            pass


app = FastAPI(
    title="Vaikkal Platform API",
    version=APP_VERSION,
    description=(
        "Farm-to-home digital marketplace. Fresh produce with transparent "
        "pricing, demand forecasting, traceability passports and fair farmer settlements."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Auth", "description": "Registration, OTP, login, tokens"},
        {"name": "Products", "description": "Categories, products, listings, search"},
        {"name": "Orders", "description": "Cart, checkout, payments, order lifecycle"},
        {"name": "Producer", "description": "Farmer/FPO profiles, batches, settlements"},
        {"name": "Bulk Procurement", "description": "Requirements, quotations, purchase orders"},
        {"name": "Delivery", "description": "Partner registration, routes, statuses"},
        {"name": "Admin", "description": "Dashboard, verification, analytics"},
        {"name": "AI", "description": "Forecasting, recommendations, route optimization, price simulator"},
        {"name": "Notifications", "description": "In-app and provider notifications"},
        {"name": "Traceability", "description": "Batch passports and QR scanning"},
        {"name": "Location", "description": "Addresses, service areas, collection centers"},
        {"name": "Reviews", "description": "Product reviews and farmer responses"},
        {"name": "Group Orders", "description": "Community group buying"},
        {"name": "Subscriptions", "description": "Recurring household deliveries"},
        {"name": "Harvest Prebooking", "description": "Reserve produce before harvest"},
        {"name": "Sustainability", "description": "Impact and CO2 metrics"},
        {"name": "Health", "description": "Service health checks"},
    ],
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# ---------- Routes ----------
# Include every router under /api/v1, and again under /api/backend/api/v1 so the
# same API is reachable both directly and through the Vercel "/api/backend" service.
_API_ROUTERS = [
    auth.router,
    products.router,
    orders.router,
    producer.router,
    bulk.router,
    delivery.router,
    admin.router,
    ai_routes.router,
    notifications.router,
    traceability.router,
    location.router,
    reviews.router,
    group_orders.router,
    subscriptions.router,
    harvest_prebooking.router,
    sustainability.router,
]
for _router in _API_ROUTERS:
    app.include_router(_router, prefix="/api/v1")
    app.include_router(_router, prefix="/api/backend/api/v1")


# ---------- Health ----------
@app.get("/health", tags=["Health"], summary="Liveness + readiness probe")
async def health() -> JSONResponse:
    db_ok = await ping_database()
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={
            "status": "ok" if db_ok else "degraded",
            "app": settings.APP_NAME,
            "version": APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "database": "connected" if db_ok else "unreachable",
        },
    )


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {
        "app": settings.APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


# ---------- Global exception handlers ----------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    if settings.DEBUG:
        print(f"[error] {request.method} {request.url.path}: {exc!r}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error", "code": "internal_error"},
    )
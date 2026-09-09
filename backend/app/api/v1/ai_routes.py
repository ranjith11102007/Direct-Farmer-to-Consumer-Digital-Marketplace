"""AI / ML API routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.models.ai import Forecast, ForecastPeriod
from app.models.food_loss import FoodLossAlert, AlertStatus
from app.schemas.ai import (
    FoodLossAlertOut,
    ForecastOut,
    ForecastRequest,
    ForecastResultOut,
    PriceSimulationOut,
    RecommendationOut,
    RouteOptimizeOutput,
)
from app.schemas.common import ApiResponse
from app.ai.demand_forecaster import DemandForecaster, ForecastService
from app.ai.recommendations import RecommendationEngine, RecommendationService
from app.ai.route_optimizer import RouteOptimizer
from app.ai.price_simulator import FairPriceSimulator
from app.ai.food_loss import FoodLossService
from app.utils.validators import ValidationError

router = APIRouter(prefix="/ai", tags=["AI"])


def _err(exc: Exception) -> HTTPException:
    if isinstance(exc, ValidationError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")


@router.post("/forecast", response_model=ApiResponse[dict])
async def generate_forecast(payload: ForecastRequest, db: SessionDep):
    try:
        product_id = uuid.UUID(payload.product_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid product id")

    try:
        horizon = ForecastPeriod(payload.horizon)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid horizon")

    try:
        forecaster = DemandForecaster()
        result = await forecaster.forecast(
            db,
            product_id=product_id,
            district=payload.district,
            horizon=horizon,
            lookback_days=payload.lookback_days,
        )
        saved = await ForecastService.save_forecast(
            db, product_id=product_id, district=payload.district or "all", horizon=horizon, result=result
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    return ApiResponse(
        data={
            "forecast": ForecastResultOut(
                predicted_demand=result.predicted_demand,
                confidence_lower=result.confidence_lower,
                confidence_upper=result.confidence_upper,
                factors=result.factors,
                model_version=result.model_version,
                data_points_used=result.data_points_used,
                dataset_label=result.dataset_label,
                is_low_data=result.is_low_data,
                horizon=horizon.value,
                horizon_date=result.horizon_date,
            ).model_dump(mode="json"),
            "saved_forecast_id": str(saved.id),
        },
        message="Forecast generated.",
    )


@router.get("/forecast", response_model=ApiResponse[list[ForecastOut]])
async def list_forecasts(
    db: SessionDep,
    product_id: str | None = Query(default=None),
    district: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await ForecastService.list(
        db,
        product_id=uuid.UUID(product_id) if product_id else None,
        district=district,
        page=page,
        page_size=page_size,
    )
    items = [ForecastOut.model_validate(f).model_dump(mode="json") for f in result["items"]]
    return ApiResponse(data=items, meta={
        "page": page, "page_size": page_size, "total": result["total"],
    })


@router.get("/forecast/latest", response_model=ApiResponse[ForecastOut | None])
async def latest_forecast(
    db: SessionDep,
    product_id: str,
    district: str | None = Query(default=None),
    horizon: str = Query(default="weekly"),
):
    try:
        h = ForecastPeriod(horizon)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid horizon")
    forecast = await ForecastService.get_latest(
        db, product_id=uuid.UUID(product_id), district=district or "all", horizon=h
    )
    return ApiResponse(data=ForecastOut.model_validate(forecast).model_dump(mode="json") if forecast else None)


@router.get("/recommendations", response_model=ApiResponse[list[RecommendationOut]])
async def recommendations(
    db: SessionDep,
    user: CurrentUser,
    district: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
):
    engine = RecommendationEngine(limit=limit)
    recs = await engine.recommend(db, user_id=user.id, district=district)
    await RecommendationService.save_recommendations(db, user_id=user.id, recommendations=recs)
    return ApiResponse(data=[
        RecommendationOut(
            id=str(uuid.uuid4()),
            user_id=str(user.id),
            type="restock",
            title=r["listing"].product.name if r["listing"].product else "Recommended",
            message="Recommended for you",
            data_json=r["reasons"],
            confidence=min(1.0, r["score"] / 10.0),
            product_id=str(r["listing"].product_id),
            is_read=False,
            is_dismissed=False,
        ).model_dump(mode="json")
        for r in recs
    ])


@router.post("/route/optimize", response_model=ApiResponse[RouteOptimizeOutput])
async def optimize_route(db: SessionDep, payload: dict):
    try:
        stops = payload["stops"]
    except KeyError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="stops required")

    optimizer = RouteOptimizer()
    result = optimizer.optimize(
        stops=stops,
        vehicle_capacity_kg=float(payload.get("vehicle_capacity_kg", 500)),
        start_time=payload.get("start_time"),
        max_stops=int(payload.get("max_stops", 25)),
        depot=tuple(payload["depot"]) if payload.get("depot") else None,
    )
    return ApiResponse(data=result)


@router.post("/price-simulator", response_model=ApiResponse[PriceSimulationOut])
async def price_simulator(payload: dict, db: SessionDep, user: CurrentUser):
    try:
        product_id = uuid.UUID(payload["product_id"])
        quantity = float(payload.get("quantity", 1))
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="product_id and quantity required")

    simulator = FairPriceSimulator()
    try:
        result = await simulator.simulate(db, product_id=product_id, quantity_kg=quantity, user_id=user.id)
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc))

    from app.schemas.ai import PriceQuoteOut

    return ApiResponse(data=PriceSimulationOut(
        product_id=str(result.product_id),
        quantity_kg=result.quantity_kg,
        baseline_price_per_kg=result.baseline_price_per_kg,
        quotes=[PriceQuoteOut(**q.__dict__).model_dump(mode="json") for q in result.quotes],
        best_channel=PriceQuoteOut(**result.best_channel.__dict__).model_dump(mode="json"),
        summary=result.summary,
        simulation_id=str(result.simulation_id) if result.simulation_id else None,
    ).model_dump(mode="json"))


@router.post("/food-loss/detect", response_model=ApiResponse[list[FoodLossAlertOut]])
async def detect_food_loss(db: SessionDep, user: CurrentUser, district: str | None = Query(default=None)):
    alerts = await FoodLossService.run_detection(db, district=district)
    return ApiResponse(data=[FoodLossAlertOut.model_validate(a).model_dump(mode="json") for a in alerts], message="Detection complete.")


@router.get("/food-loss", response_model=ApiResponse[list[FoodLossAlertOut]])
async def list_food_loss(
    db: SessionDep,
    user: CurrentUser,
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    result = await FoodLossService.list_alerts(db, page=page, page_size=page_size)
    items = [FoodLossAlertOut.model_validate(a).model_dump(mode="json") for a in result["items"]]
    return ApiResponse(data=items, meta={
        "page": page, "page_size": page_size, "total": result["total"],
    })


@router.post("/food-loss/{alert_id}/acknowledge", response_model=ApiResponse[FoodLossAlertOut])
async def acknowledge_food_loss(alert_id: str, db: SessionDep, user: CurrentUser):
    alert = (
        await db.execute(select(FoodLossAlert).where(FoodLossAlert.id == uuid.UUID(alert_id)))
    ).scalar_one_or_none()
    if alert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert = await FoodLossService.update_status(db, alert, AlertStatus.ACKNOWLEDGED)
    return ApiResponse(data=FoodLossAlertOut.model_validate(alert).model_dump(mode="json"), message="Alert acknowledged.")
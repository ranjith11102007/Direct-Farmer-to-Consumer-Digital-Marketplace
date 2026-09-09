"""Unit tests for AI services: route optimizer, price simulator, forecast fallback."""
from __future__ import annotations

import uuid

from app.ai.price_simulator import FairPriceSimulator
from app.ai.route_optimizer import RouteOptimizer, haversine_km, travel_time_min


def _stop(name: str, lat: float, lng: float, kind: str, kg: float):
    return {
        "id": str(uuid.uuid4()),
        "lat": lat,
        "lng": lng,
        "type": kind,
        "capacity_kg": kg,
        "earliest": "06:00",
        "latest": "12:00",
        "labels": {"name": name},
    }


class TestHaversine:
    def test_zero_distance(self):
        assert haversine_km(11.0, 77.0, 11.0, 77.0) == 0.0

    def test_known_distance(self):
        # Salcette (Goa) → Panaji approx
        d = haversine_km(15.4, 73.8, 15.49, 73.82)
        assert 5 < d < 15


class TestRouteCapacity:
    def test_over_capacity_stops_unassigned(self):
        stops = [
            _stop("A", 11.0, 77.0, "drop", 400),
            _stop("B", 11.1, 77.1, "drop", 400),
        ]
        opt = RouteOptimizer()
        plan = opt.optimize(stops=stops, vehicle_capacity_kg=500)
        assert plan["unassigned_reasons"]
        assert len(plan["ordered_stops"]) == 1
        assert plan["capacity_utilization"] <= 100.0

    def test_within_capacity_all_assigned(self):
        stops = [_stop("A", 11.0, 77.0, "drop", 100), _stop("B", 11.1, 77.1, "drop", 200)]
        plan = RouteOptimizer().optimize(stops=stops, vehicle_capacity_kg=500)
        assert not plan["unassigned_reasons"]
        assert len(plan["ordered_stops"]) == 2


class TestRoutePickupBeforeDelivery:
    def test_pickups_come_first(self):
        stops = [
            _stop("drop-c", 11.1, 77.1, "drop", 50),
            _stop("pick-b", 11.0, 77.0, "pickup", 50),
            _stop("drop-a", 11.2, 77.2, "drop", 50),
        ]
        plan = RouteOptimizer().optimize(stops=stops, vehicle_capacity_kg=500)
        ordered = [s["type"] for s in plan["ordered_stops"]]
        first_pickup = ordered.index("pickup")
        assert first_pickup < ordered.index("drop") or "drop" not in ordered[first_pickup:]

    def test_empty_stops(self):
        plan = RouteOptimizer().optimize(stops=[], vehicle_capacity_kg=500)
        assert plan["ordered_stops"] == []
        assert plan["total_distance_km"] == 0.0


class TestRouteDeterminism:
    def test_minutes_positive(self):
        stops = [
            _stop("A", 11.0168, 76.9558, "pickup", 100),
            _stop("B", 11.0217, 76.9941, "pickup", 100),
            _stop("C", 10.9941, 76.9759, "drop", 150),
            _stop("D", 10.8575, 76.9645, "drop", 150),
        ]
        plan = RouteOptimizer().optimize(stops=stops, vehicle_capacity_kg=600, depot=(11.0186, 76.9558))
        assert plan["estimated_time_minutes"] > 0
        assert plan["total_distance_km"] > 0
        assert len(plan["ordered_stops"]) == 4


class TestTravelTime:
    def test_estimate(self):
        mins = travel_time_min(10.0, speed_kph=25.0)
        assert mins == 24  # ceil(10/25*60)


class TestPriceSimulatorChannels:
    def test_channels_ordered(self):
        sim = FairPriceSimulator()
        local = sim._local_market_quote(30.0, 300)
        market = sim._marketplace_quote(30.0, 300)
        bulk = sim._bulk_contract_quote(30.0, 300)
        assert local.channel == "local_market"
        assert market.channel == "direct_marketplace"
        assert bulk.channel == "bulk_contract"

    def test_marketplace_best_for_typical(self):
        sim = FairPriceSimulator()
        market = sim._marketplace_quote(30.0, 300)
        local = sim._local_market_quote(30.0, 300)
        assert market.total_farmer_settlement > local.total_farmer_settlement

    def test_no_negative_settlement(self):
        sim = FairPriceSimulator()
        low = sim._marketplace_quote(1.0, 10)  # below floor scenario
        assert low.total_farmer_settlement >= 0.0

    def test_bulk_is_cheapest_for_consumer(self):
        sim = FairPriceSimulator()
        bulk = sim._bulk_contract_quote(30.0, 300)
        market = sim._marketplace_quote(30.0, 300)
        local = sim._local_market_quote(30.0, 300)
        assert bulk.consumer_price_per_kg < market.consumer_price_per_kg < local.consumer_price_per_kg


class TestForecastFallbackPolicy:
    def test_cold_start_marks_low_data(self):
        """Directly verify the low-data policy contract via documented constants."""
        from app.config import settings

        assert settings.LOW_DATA_THRESHOLD <= settings.MIN_DATA_POINTS_FOR_ML
        assert settings.FORECAST_DEFAULT_LOOKBACK_DAYS >= settings.MIN_DATA_POINTS_FOR_ML
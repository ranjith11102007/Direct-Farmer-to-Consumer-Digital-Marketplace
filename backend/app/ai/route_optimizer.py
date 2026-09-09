"""Route optimization: nearest-neighbor + 2-opt with constraints."""
from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from datetime import datetime, time as time_type
from typing import Any

import numpy as np

EARTH_RADIUS_KM = 6371.0
AVG_SPEED_KPH = 25.0
SERVICE_TIME_MIN = 3.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def travel_time_min(distance_km: float, speed_kph: float = AVG_SPEED_KPH) -> int:
    return int(math.ceil((distance_km / max(speed_kph, 1.0)) * 60))


@dataclass
class Stop:
    id: str
    lat: float
    lng: float
    kind: str = "drop"  # "pickup" | "drop" | "depot"
    capacity_kg: float = 0.0
    service_time_min: float = SERVICE_TIME_MIN
    earliest: time_type | None = None
    latest: time_type | None = None
    labels: dict[str, Any] = field(default_factory=dict)


@dataclass
class RoutePlan:
    ordered_stops: list[dict[str, Any]]
    total_distance_km: float
    estimated_time_minutes: int
    capacity_utilization: float
    optimization_score: float
    unassigned_reasons: list[str] = field(default_factory=list)


class RouteOptimizer:
    """Construct feasible, time-window-aware routes for delivery partners."""

    def __init__(
        self,
        *,
        avg_speed_kph: float = AVG_SPEED_KPH,
        single_depot: tuple[float, float] | None = None,
    ) -> None:
        self.avg_speed_kph = avg_speed_kph
        self.depot = single_depot

    # ---------- Public API ----------

    def optimize(
        self,
        *,
        stops: list[dict[str, Any]],
        vehicle_capacity_kg: float | None = None,
        start_time: time_type | None = None,
        max_stops: int = 25,
        depot: tuple[float, float] | None = None,
    ) -> dict[str, Any]:
        start_time = start_time or time_type(8, 0, 0)
        unassigned: list[str] = []

        parsed: list[Stop] = []
        for raw in stops:
            try:
                stop = self._parse_stop(raw)
                parsed.append(stop)
            except (ValueError, TypeError, KeyError):
                continue

        # Capacity check.
        total_kg = sum(s.capacity_kg for s in parsed if s.capacity_kg)
        capacity = vehicle_capacity_kg or 10_000_000.0
        if total_kg > capacity:
            over = total_kg - capacity
            parsed.sort(key=lambda s: s.capacity_kg, reverse=True)
            while parsed and over > 0:
                removed = parsed.pop(0)
                over -= removed.capacity_kg
                unassigned.append(
                    f"{removed.id}: exceeds vehicle capacity {capacity:g}kg"
                )

        # Hard stop-count limit for sanity.
        if len(parsed) > max_stops:
            excess = parsed[max_stops:]
            parsed = parsed[:max_stops]
            unassigned.extend(f"{s.id}: over max_stops={max_stops}" for s in excess)

        if not parsed:
            return {
                "ordered_stops": [],
                "total_distance_km": 0.0,
                "estimated_time_minutes": 0,
                "capacity_utilization": 0.0,
                "optimization_score": 0.0,
                "unassigned_reasons": unassigned,
            }

        ordered = self._route(parsed, depot=depot or self.depot)
        total_km = self._route_distance(ordered, depot=depot or self.depot)
        time_min, feasible = self._schedule_time(ordered, start_time=start_time)

        if not feasible:
            ordered = self._repair_time_windows(ordered, start_time=start_time)

        delivered_kg = sum(s.capacity_kg for s in ordered)
        utilization = min(100.0, (delivered_kg / capacity) * 100.0) if capacity > 0 else 0.0
        score = self._score(total_km, time_min, len(ordered), max_stops)

        return {
            "ordered_stops": [self._stop_dict(s) for s in ordered],
            "total_distance_km": round(total_km, 2),
            "estimated_time_minutes": time_min,
            "capacity_utilization": round(utilization, 2),
            "optimization_score": round(score, 2),
            "unassigned_reasons": unassigned,
        }

    # ---------- Internals ----------

    def _parse_stop(self, raw: dict[str, Any]) -> Stop:
        def _num(key: str, default: float | None = None) -> float:
            value = raw.get(key)
            if value is None or value == "":
                if default is None:
                    raise KeyError(key)
                return default
            return float(value)

        lat, lng = _num("lat"), _num("lng")
        return Stop(
            id=str(raw.get("id", raw.get("delivery_id", f"st-{time.time()}"))),
            lat=lat,
            lng=lng,
            kind=str(raw.get("type", raw.get("kind", "drop"))),
            capacity_kg=_num("capacity_kg", 0.0),
            service_time_min=_num("service_time_min", SERVICE_TIME_MIN),
            earliest=self._parse_time(raw.get("earliest")),
            latest=self._parse_time(raw.get("latest")),
            labels=raw.get("labels", {}),
        )

    @staticmethod
    def _parse_time(value: Any) -> time_type | None:
        if value is None or value == "":
            return None
        if isinstance(value, time_type):
            return value
        if isinstance(value, str):
            try:
                parsed = datetime.strptime(value, "%H:%M")
                return parsed.time()
            except ValueError:
                try:
                    parsed = datetime.fromisoformat(value)
                    return parsed.time()
                except ValueError:
                    return None
        if isinstance(value, (int, float)):
            return time_type(int(value // 100), int(value % 100))
        return None

    def _route(self, stops: list[Stop], depot: tuple[float, float] | None) -> list[Stop]:
        """Nearest-neighbor construction + 2-opt improvement."""
        coords = [(s.lat, s.lng) for s in stops]
        n = len(stops)
        matrix = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                matrix[i][j] = haversine_km(*coords[i], *coords[j])

        order = self._nearest_neighbor(matrix)
        order = self._two_opt(matrix, order)

        reordered = [stops[i] for i in order]
        return self._order_pickups_before_drops(reordered)

    @staticmethod
    def _nearest_neighbor(matrix: np.ndarray) -> list[int]:
        n = matrix.shape[0]
        if n == 0:
            return []
        start = int(np.argmin(matrix.sum(axis=1)))
        visited = {start}
        order = [start]
        current = start
        while len(visited) < n:
            candidates = [(j, matrix[current][j]) for j in range(n) if j not in visited]
            if not candidates:
                break
            nxt, _dist = min(candidates, key=lambda pair: pair[1])
            visited.add(nxt)
            order.append(nxt)
            current = nxt
        return order

    @classmethod
    def _two_opt(cls, matrix: np.ndarray, order: list[int], attempts: int = 60) -> list[int]:
        n = len(order)
        best = list(order)

        def route_cost(seq: list[int]) -> float:
            cost = 0.0
            for a, b in zip(seq, seq[1:]):
                cost += matrix[a][b]
            return cost

        current_cost = route_cost(best)
        improved = True
        iterations = 0
        while improved and iterations < attempts:
            improved = False
            iterations += 1
            for i in range(1, n - 1):
                for j in range(i + 1, n):
                    candidate = best[:i] + best[i:j + 1][::-1] + best[j + 1:]
                    cost = route_cost(candidate)
                    if cost < current_cost - 1e-6:
                        best = candidate
                        current_cost = cost
                        improved = True
                        break
                if improved:
                    break
        return best

    @staticmethod
    def _order_pickups_before_drops(stops: list[Stop]) -> list[Stop]:
        pickups: list[Stop] = []
        drops: list[Stop] = []
        for s in stops:
            (pickups if s.kind == "pickup" else drops).append(s)
        return pickups + drops

    def _route_distance(self, ordered: list[Stop], depot: tuple[float, float] | None) -> float:
        if not ordered:
            return 0.0
        total = 0.0
        if depot:
            total += haversine_km(depot[0], depot[1], ordered[0].lat, ordered[0].lng)
        for a, b in zip(ordered, ordered[1:]):
            total += haversine_km(a.lat, a.lng, b.lat, b.lng)
        if depot:
            total += haversine_km(ordered[-1].lat, ordered[-1].lng, depot[0], depot[1])
        return total

    def _schedule_time(
        self, ordered: list[Stop], start_time: time_type
    ) -> tuple[int, bool]:
        """Returns (total_minutes, time_windows_feasible)."""
        from datetime import timedelta

        total = 0
        feasible = True
        current = datetime(2000, 1, 1, start_time.hour, start_time.minute, start_time.second)

        if self.depot:
            first = ordered[0]
            total += travel_time_min(haversine_km(self.depot[0], self.depot[1], first.lat, first.lng), self.avg_speed_kph)

        for idx, stop in enumerate(ordered):
            arrival_time = current + timedelta(minutes=total)
            arrival = arrival_time.time()
            if stop.earliest and arrival < stop.earliest:
                total += (stop.earliest.hour * 60 + stop.earliest.minute) - (arrival.hour * 60 + arrival.minute)
                feasible = False
            if stop.latest and arrival > stop.latest:
                feasible = False
            total += int(stop.service_time_min)
            if idx < len(ordered) - 1:
                nxt = ordered[idx + 1]
                total += travel_time_min(haversine_km(stop.lat, stop.lng, nxt.lat, nxt.lng), self.avg_speed_kph)

        if self.depot and len(ordered) > 1:
            last = ordered[-1]
            total += travel_time_min(haversine_km(last.lat, last.lng, self.depot[0], self.depot[1]), self.avg_speed_kph)

        return total, feasible

    def _repair_time_windows(
        self, ordered: list[Stop], start_time: time_type
    ) -> list[Stop]:
        """Re-sort by earliest window (most constrained first) when infeasible."""
        with_windows = [s for s in ordered if s.earliest is not None]
        without = [s for s in ordered if s.earliest is None]
        with_windows.sort(key=lambda s: s.earliest)
        return self._order_pickups_before_drops(with_windows + without)

    def _score(self, distance_km: float, time_min: int, n_stops: int, max_stops: int) -> float:
        efficiency = max(0.0, 1.0 - (time_min / (n_stops * 20 + 1)))
        distance_penalty = max(0.0, 1.0 - (distance_km / (n_stops * 3 + 1)))
        utilization_bonus = min(1.0, n_stops / max(1, max_stops))
        return (efficiency * 0.5 + distance_penalty * 0.3 + utilization_bonus * 0.2) * 100

    @staticmethod
    def _stop_dict(stop: Stop) -> dict[str, Any]:
        return {
            "id": stop.id,
            "type": stop.kind,
            "lat": stop.lat,
            "lng": stop.lng,
            "capacity_kg": stop.capacity_kg,
            "earliest": stop.earliest.strftime("%H:%M") if stop.earliest else None,
            "latest": stop.latest.strftime("%H:%M") if stop.latest else None,
            "labels": stop.labels,
        }
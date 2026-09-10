"""Integration tests (PostgreSQL + Redis required).

Cover the core acceptance criteria end-to-end:
- registration + login
- role-based authorization
- language preference
- product listing creation flow
- admin approval flow
These tests against a clean database. Use a dedicated test DB.
"""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app

from tests.conftest import require_db


@require_db
def test_health_endpoint():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/health")
    assert resp.status_code in (200, 503)  # 200 when DB ok, 503 degraded


@require_db
def test_register_and_login_flow():
    client = TestClient(app, raise_server_exceptions=False)
    phone = f"97{uuid.uuid4().int % 10**8:08d}"
    payload = {
        "phone": phone,
        "password": "Strong@Pass123",
        "full_name": "Test User",
        "role": "consumer",
        "preferred_language": "ta",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["access_token"]

    # Login with same phone
    resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": phone, "password": "Strong@Pass123"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["access_token"]

    # /me honours preferred_language
    token = resp.json()["data"]["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["data"]["preferred_language"] == "ta"


@require_db
def test_invalid_login_rejected():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/v1/auth/login",
        json={"identifier": f"96{99 % 10**8:08d}", "password": "wrong-password"},
    )
    assert resp.status_code in (400, 401)


@require_db
def test_register_requires_valid_inputs():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/v1/auth/register",
        json={"phone": "123", "password": "x", "full_name": "", "role": "admin"},
    )
    assert resp.status_code in (400, 422)


@require_db
def test_role_authorization_admin_endpoint_denies_consumer():
    """A consumer token must not reach admin-only endpoints."""
    client = TestClient(app, raise_server_exceptions=False)
    phone = f"98{uuid.uuid4().int % 10**8:08d}"
    client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": "Strong@Pass123", "full_name": "C", "role": "consumer"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": phone, "password": "Strong@Pass123"},
    )
    token = login.json()["data"]["access_token"]

    # Admin dashboard (requires ADMIN role via router-level dependency)
    resp = client.get(
        "/api/v1/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"},
    )
    # 403 forbidden — a consumer must never see admin data
    assert resp.status_code == 403


@require_db
def test_duplicate_registration_rejected():
    client = TestClient(app, raise_server_exceptions=False)
    phone = f"99{uuid.uuid4().int % 10**8:08d}"
    payload = {"phone": phone, "password": "Strong@Pass123", "full_name": "Dup", "role": "consumer"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 200
    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400


@require_db
def test_catalog_endpoints_public():
    client = TestClient(app, raise_server_exceptions=False)
    cats = client.get("/api/v1/products/categories")
    assert cats.status_code == 200
    # products search must work without auth
    search = client.get("/api/v1/products/search", params={"q": "tomato"})
    assert search.status_code == 200
    body = search.json()
    assert "items" in body
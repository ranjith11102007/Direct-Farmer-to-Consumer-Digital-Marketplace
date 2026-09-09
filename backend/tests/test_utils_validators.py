"""Unit tests for input validators and generic helpers."""
from __future__ import annotations

import pytest

from app.utils.helpers import (
    add_days,
    clamp,
    format_error,
    format_response,
    generate_batch_number,
    generate_order_number,
    iso_format,
    now_utc,
    start_of_today_utc,
)
from app.utils.validators import (
    ValidationError,
    is_valid_coordinate,
    validate_email,
    validate_gst,
    validate_ifsc,
    validate_phone,
    validate_pincode,
    validate_price,
    validate_quantity,
    validate_rating,
)


class TestPhone:
    def test_valid_phones(self):
        assert validate_phone("9876543210") == "9876543210"
        assert validate_phone("+91 98765 43210") == "9876543210"
        assert validate_phone("+91-9876543210") == "9876543210"

    def test_invalid_phones(self):
        for bad in ["12345", "0987654321", "987654", "", "abc"]:
            with pytest.raises(ValidationError):
                validate_phone(bad)


class TestEmail:
    def test_valid(self):
        assert validate_email("FARMER@Example.com") == "farmer@example.com"

    def test_invalid(self):
        for bad in ["not-an-email", "a@b", "@x.com", "a@b@c.com"]:
            with pytest.raises(ValidationError):
                validate_email(bad)


class TestPincode:
    def test_valid(self):
        assert validate_pincode("641001") == "641001"

    def test_invalid(self):
        for bad in ["64100", "64100a", "64 1001", ""]:
            with pytest.raises(ValidationError):
                validate_pincode(bad)


class TestIfsc:
    def test_valid(self):
        assert validate_ifsc("SBIN0001234") == "SBIN0001234"
        assert validate_ifsc("sbin0001234") == "SBIN0001234"

    def test_invalid(self):
        for bad in ["SBIN1234", "TEST1", "SBIN00"]:
            with pytest.raises(ValidationError):
                validate_ifsc(bad)


class TestGst:
    def test_valid(self):
        assert validate_gst("33AABCU9603R1ZM") == "33AABCU9603R1ZM"

    def test_invalid(self):
        for bad in ["33", "33AABCU9603R1Z", ""]:
            with pytest.raises(ValidationError):
                validate_gst(bad)


class TestPrice:
    def test_valid(self):
        assert validate_price("45.5") == 45.5
        assert validate_price(0) == 0.0

    def test_negative_rejected(self):
        with pytest.raises(ValidationError):
            validate_price(-5)

    def test_huge_rejected(self):
        with pytest.raises(ValidationError):
            validate_price(10**12)

    def test_non_numeric_rejected(self):
        with pytest.raises(ValidationError):
            validate_price("abc")


class TestQuantity:
    def test_valid(self):
        assert validate_quantity(2.5) == 2.5

    def test_zero_rejected(self):
        with pytest.raises(ValidationError):
            validate_quantity(0)

    def test_negative_rejected(self):
        with pytest.raises(ValidationError):
            validate_quantity(-1)

    def test_huge_rejected(self):
        with pytest.raises(ValidationError):
            validate_quantity(10**8)


class TestRating:
    def test_valid(self):
        assert validate_rating(5) == 5

    def test_invalid(self):
        for bad in [0, 6, "x"]:
            with pytest.raises(ValidationError):
                validate_rating(bad)


class TestCoordinates:
    def test_valid(self):
        assert is_valid_coordinate(11.01, 76.95)
        assert not is_valid_coordinate(91.0, 76.95)  # lat out of range
        assert not is_valid_coordinate(None, 76.95)


class TestHelpers:
    def test_clamp(self):
        assert clamp(150, 0, 100) == 100
        assert clamp(-1, 0, 100) == 0
        assert clamp(50, 0, 100) == 50

    def test_order_number_shape(self):
        n = generate_order_number()
        assert n.startswith("VK-")
        assert len(n) == len("VK-YYYYMMDD-XXXXXX")

    def test_batch_number_shape(self):
        b = generate_batch_number()
        assert b.startswith("BTC-")
        assert len(b) == len("BTC-YYYY-XXXXXX")

    def test_timestamps(self):
        assert now_utc().tzinfo is not None
        assert iso_format(None) is None
        assert start_of_today_utc().hour == 0
        assert add_days(2) > now_utc()

    def test_format_response(self):
        payload = format_response({"a": 1}, message="ok", meta={"page": 1})
        assert payload["success"] is True
        assert payload["data"] == {"a": 1}
        assert payload["meta"]["page"] == 1

    def test_format_error(self):
        payload = format_error("boom", code="E1", details=["x"])
        assert payload["success"] is False
        assert payload["code"] == "E1"
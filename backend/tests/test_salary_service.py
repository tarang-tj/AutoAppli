"""Tests for salary_service — compensation creation and comparison."""
from __future__ import annotations

from app.services.salary_service import make_compensation, compare_offers


# ── make_compensation ─────────────────────────────────────────────


def test_compensation_has_required_fields():
    comp = make_compensation(base_salary=100000)
    assert comp["id"].startswith("comp-")
    assert comp["base_salary"] == 100000
    assert comp["total_compensation"] == 100000
    assert comp["currency"] == "USD"
    assert comp["pay_period"] == "annual"


def test_compensation_total_calculated():
    comp = make_compensation(
        base_salary=120000,
        bonus=15000,
        equity_value=40000,
        signing_bonus=10000,
        benefits_value=5000,
    )
    assert comp["total_compensation"] == 190000


def test_compensation_custom_fields():
    comp = make_compensation(
        job_id="job-5",
        base_salary=80000,
        currency="EUR",
        pay_period="annual",
        notes="Good benefits",
    )
    assert comp["job_id"] == "job-5"
    assert comp["currency"] == "EUR"
    assert comp["notes"] == "Good benefits"


def test_compensation_unique_ids():
    c1 = make_compensation(base_salary=100000)
    c2 = make_compensation(base_salary=120000)
    assert c1["id"] != c2["id"]


def test_compensation_defaults():
    comp = make_compensation()
    assert comp["base_salary"] == 0
    assert comp["bonus"] == 0
    assert comp["equity_value"] == 0
    assert comp["total_compensation"] == 0


# ── compare_offers ────────────────────────────────────────────────


def test_compare_empty():
    result = compare_offers([])
    assert result["best_total"] is None
    assert result["average_total"] == 0


def test_compare_single():
    entries = [make_compensation(base_salary=100000)]
    result = compare_offers(entries)
    assert result["count"] == 1
    assert result["average_total"] == 100000


def test_compare_multiple():
    entries = [
        make_compensation(base_salary=100000, bonus=10000),
        make_compensation(base_salary=150000, bonus=20000),
        make_compensation(base_salary=120000, bonus=15000),
    ]
    result = compare_offers(entries)
    assert result["count"] == 3
    # Best total should be 170000
    best = next(e for e in entries if e["id"] == result["best_total_id"])
    assert best["total_compensation"] == 170000
    # Best base should be 150000
    best_base = next(e for e in entries if e["id"] == result["best_base_id"])
    assert best_base["base_salary"] == 150000
    # Entries should be sorted descending by total
    assert result["entries"][0]["total_compensation"] >= result["entries"][1]["total_compensation"]


def test_compare_average():
    entries = [
        make_compensation(base_salary=100000),
        make_compensation(base_salary=200000),
    ]
    result = compare_offers(entries)
    assert result["average_total"] == 150000.0

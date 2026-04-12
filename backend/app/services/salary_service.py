"""Salary & compensation tracking — create entries, compute comparisons."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


def make_compensation(
    *,
    job_id: str | None = None,
    base_salary: float = 0,
    bonus: float = 0,
    equity_value: float = 0,
    signing_bonus: float = 0,
    benefits_value: float = 0,
    currency: str = "USD",
    pay_period: str = "annual",
    notes: str = "",
    user_id: str | None = None,
) -> dict:
    """Create an in-memory compensation entry dict."""
    now = datetime.now(timezone.utc).isoformat()
    total = base_salary + bonus + equity_value + signing_bonus + benefits_value
    return {
        "id": f"comp-{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "base_salary": base_salary,
        "bonus": bonus,
        "equity_value": equity_value,
        "signing_bonus": signing_bonus,
        "benefits_value": benefits_value,
        "total_compensation": total,
        "currency": currency,
        "pay_period": pay_period,
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }


def compare_offers(entries: list[dict]) -> dict:
    """Build a comparison summary across compensation entries."""
    if not entries:
        return {"entries": [], "best_total": None, "best_base": None, "average_total": 0}

    best_total = max(entries, key=lambda e: e.get("total_compensation", 0))
    best_base = max(entries, key=lambda e: e.get("base_salary", 0))
    avg_total = sum(e.get("total_compensation", 0) for e in entries) / len(entries)

    ranked = sorted(entries, key=lambda e: e.get("total_compensation", 0), reverse=True)

    return {
        "entries": ranked,
        "best_total_id": best_total["id"],
        "best_base_id": best_base["id"],
        "average_total": round(avg_total, 2),
        "count": len(entries),
    }

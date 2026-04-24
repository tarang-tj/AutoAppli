"""
Unit tests for the ingest-time normalizers.

Every test is a single input/output pair. Keep them boring — the value of
this suite is breadth of coverage, not clever parameterization.

Organized into four blocks:
  1. normalize_location — US cases (dominant for student internship targets)
  2. normalize_location — non-US + remote + edge cases
  3. normalize_company  — strip + canonicalize cases
  4. should_mark_remote — reconciliation helper
"""
from __future__ import annotations

import pytest

from backend.app.services.ingestion.normalizers import (
    LocationNorm,
    NORMALIZER_VERSION,
    normalize_company,
    normalize_location,
    should_mark_remote,
)


# ---------------------------------------------------------------------------
# normalize_location — US
# ---------------------------------------------------------------------------

US_LOCATION_CASES: list[tuple[str, LocationNorm]] = [
    ("San Francisco, CA", LocationNorm(city="San Francisco", region="CA", country="US")),
    ("New York, NY", LocationNorm(city="New York", region="NY", country="US")),
    ("Seattle, WA", LocationNorm(city="Seattle", region="WA", country="US")),
    ("Austin, TX", LocationNorm(city="Austin", region="TX", country="US")),
    ("Boston, MA", LocationNorm(city="Boston", region="MA", country="US")),
    ("Los Angeles, California", LocationNorm(city="Los Angeles", region="CA", country="US")),
    ("Chicago, Illinois", LocationNorm(city="Chicago", region="IL", country="US")),
    ("Washington, DC", LocationNorm(city="Washington", region="DC", country="US")),
    ("Washington D.C.", LocationNorm(region="DC", country="US")),
    ("Kansas City, MO", LocationNorm(city="Kansas City", region="MO", country="US")),
    ("Saint Louis, Missouri", LocationNorm(city="Saint Louis", region="MO", country="US")),
    ("San Francisco, CA, USA", LocationNorm(city="San Francisco", region="CA", country="US")),
    ("New York, NY, United States", LocationNorm(city="New York", region="NY", country="US")),
    # Just the state is fine; no city.
    ("California", LocationNorm(region="CA", country="US")),
    ("CA", LocationNorm(region="CA", country="US")),
]


@pytest.mark.parametrize("raw,expected", US_LOCATION_CASES)
def test_location_us(raw: str, expected: LocationNorm) -> None:
    assert normalize_location(raw) == expected


# ---------------------------------------------------------------------------
# normalize_location — non-US and remote
# ---------------------------------------------------------------------------

INTL_LOCATION_CASES: list[tuple[str, LocationNorm]] = [
    # Canada
    ("Toronto, Ontario", LocationNorm(city="Toronto", region="ON", country="CA")),
    ("Toronto, ON", LocationNorm(city="Toronto", region="ON", country="CA")),
    ("Vancouver, BC, Canada", LocationNorm(city="Vancouver", region="BC", country="CA")),
    ("Montreal, Quebec", LocationNorm(city="Montreal", region="QC", country="CA")),
    # UK
    ("London, UK", LocationNorm(city="London", country="GB")),
    ("London, United Kingdom", LocationNorm(city="London", country="GB")),
    ("Edinburgh, Scotland", LocationNorm(city="Edinburgh", country="GB")),
    # Other
    ("Berlin, Germany", LocationNorm(city="Berlin", country="DE")),
    ("Paris, France", LocationNorm(city="Paris", country="FR")),
    ("Amsterdam, Netherlands", LocationNorm(city="Amsterdam", country="NL")),
    ("Dublin, Ireland", LocationNorm(city="Dublin", country="IE")),
    ("Bangalore, India", LocationNorm(city="Bangalore", country="IN")),
    ("Sydney, Australia", LocationNorm(city="Sydney", country="AU")),
    ("Tokyo, Japan", LocationNorm(city="Tokyo", country="JP")),
    # Singapore is in our country map, so it normalizes to country="SG" with null
    # city. Treating it as a city would require two-role entries, which our
    # policy (one canonical place per string) explicitly rejects.
    ("Singapore", LocationNorm(country="SG")),
    # City only (no country we recognize, no state)
    ("Berlin", LocationNorm(city="Berlin")),
    ("Paris", LocationNorm(city="Paris")),
]


@pytest.mark.parametrize("raw,expected", INTL_LOCATION_CASES)
def test_location_international(raw: str, expected: LocationNorm) -> None:
    assert normalize_location(raw) == expected


REMOTE_LOCATION_CASES: list[tuple[str, LocationNorm]] = [
    ("Remote", LocationNorm(is_remote=True)),
    ("remote", LocationNorm(is_remote=True)),
    ("REMOTE", LocationNorm(is_remote=True)),
    ("Fully Remote", LocationNorm(is_remote=True)),
    ("Remote - US", LocationNorm(country="US", is_remote=True)),
    ("Remote (US)", LocationNorm(country="US", is_remote=True)),
    ("Remote, US", LocationNorm(country="US", is_remote=True)),
    ("Remote - United States", LocationNorm(country="US", is_remote=True)),
    ("Remote - San Francisco, CA", LocationNorm(city="San Francisco", region="CA", country="US", is_remote=True)),
    ("Anywhere", LocationNorm(is_remote=True)),
    ("Worldwide", LocationNorm(is_remote=True)),
    ("WFH", LocationNorm(is_remote=True)),
    ("Hybrid - NYC", LocationNorm(city="NYC", is_remote=True)),
    ("Hybrid, San Francisco, CA", LocationNorm(city="San Francisco", region="CA", country="US", is_remote=True)),
    ("Distributed", LocationNorm(is_remote=True)),
]


@pytest.mark.parametrize("raw,expected", REMOTE_LOCATION_CASES)
def test_location_remote(raw: str, expected: LocationNorm) -> None:
    assert normalize_location(raw) == expected


EDGE_LOCATION_CASES: list[tuple[object, LocationNorm]] = [
    (None, LocationNorm()),
    ("", LocationNorm()),
    ("   ", LocationNorm()),
    (",,,", LocationNorm()),
    ("  San Francisco, CA  ", LocationNorm(city="San Francisco", region="CA", country="US")),
    # Unparseable freeform — city field holds whatever's left, country stays null.
    ("Mars Base Alpha", LocationNorm(city="Mars Base Alpha")),
    ("Multiple Locations", LocationNorm(city="Multiple Locations")),
]


@pytest.mark.parametrize("raw,expected", EDGE_LOCATION_CASES)
def test_location_edge(raw: object, expected: LocationNorm) -> None:
    assert normalize_location(raw) == expected  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# normalize_company
# ---------------------------------------------------------------------------

COMPANY_CASES: list[tuple[object, str]] = [
    # Basic suffix stripping
    ("Stripe, Inc.", "stripe"),
    ("Stripe Inc.", "stripe"),
    ("Stripe, Inc", "stripe"),
    ("Stripe Inc", "stripe"),
    ("Ramp Inc", "ramp"),
    ("Airbnb, Inc.", "airbnb"),
    # LLC / Ltd / Corp
    ("Acme LLC", "acme"),
    ("Acme, LLC", "acme"),
    ("Ltd Fun Ltd", "ltd fun"),
    ("Example Corp", "example"),
    ("Example Corporation", "example"),
    ("Example, Corporation", "example"),
    # International suffixes
    ("BMW GmbH", "bmw"),
    ("Siemens AG", "siemens"),
    ("Spotify AB", "spotify"),
    ("HSBC plc", "hsbc"),
    # Technology / Technologies — commonly tacked on to engineering shops
    ("Palantir Technologies", "palantir"),
    ("Dell Technologies", "dell"),
    ("Acme Technology", "acme"),
    # Hyphens preserved
    ("T-Mobile", "t-mobile"),
    ("Coca-Cola", "coca-cola"),
    # Preserve real internal nouns
    ("Meta Platforms", "meta platforms"),
    ("Northern Trust", "northern trust"),
    # Double suffix (one pass at a time)
    ("Foo Holdings Ltd", "foo"),
    # Casing + whitespace
    ("   ANTHROPIC, PBC   ", "anthropic, pbc"),  # PBC not in our suffix list; acceptable
    ("OpenAI", "openai"),
    ("OpenAI,  ", "openai"),
    # Edge
    (None, ""),
    ("", ""),
    ("   ", ""),
    (",,,", ""),
    # Slug-style input (Lever path)
    ("stripe", "stripe"),
    ("airbnb", "airbnb"),
    # Trailing punctuation
    ("Stripe.", "stripe."),  # single trailing period is not stripped (Booking.com-friendly)
    ("Stripe,", "stripe"),
    # "Co" suffix — only when preceded by separator
    ("Coca Co", "coca"),
    ("Coca Co.", "coca"),
    # But "co" as part of a word stays.
    ("Encode", "encode"),  # would be wrong if we stripped trailing "de"; this verifies we don't
]


@pytest.mark.parametrize("raw,expected", COMPANY_CASES)
def test_company(raw: object, expected: str) -> None:
    assert normalize_company(raw) == expected  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# should_mark_remote
# ---------------------------------------------------------------------------

def test_mark_remote_remote_type_wins() -> None:
    # remote_type='remote' flips the boolean regardless of location signal.
    assert should_mark_remote("remote", False) is True
    assert should_mark_remote("hybrid", False) is True


def test_mark_remote_onsite_defers_to_location() -> None:
    # If remote_type says onsite but location string says remote, trust location.
    assert should_mark_remote("onsite", True) is True
    assert should_mark_remote("onsite", False) is False


def test_mark_remote_null_remote_type_uses_location() -> None:
    assert should_mark_remote(None, True) is True
    assert should_mark_remote(None, False) is False


# ---------------------------------------------------------------------------
# Version sanity
# ---------------------------------------------------------------------------

def test_normalizer_version_is_positive_int() -> None:
    assert isinstance(NORMALIZER_VERSION, int)
    assert NORMALIZER_VERSION >= 1

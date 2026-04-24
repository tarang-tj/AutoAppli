"""
Ingest-time normalizers for location and company fields.

These are the single source of truth for turning raw ATS-provided strings into
the canonical shape we store in `cached_jobs` and `jobs`. Everything here is
pure (no I/O, no geocoding API) so the entire module is unit-testable with
plain input/output pairs.

Design doc: plans/reports/design-260424-1200-job-data-quality-pr1-foundations.md

If you find yourself reaching for a geocoder or a fuzzy-match library, stop —
the policy is: when the dumb parser cannot identify a field, we store null
and move on. PR 3 revisits the long tail if the miss rate is unacceptable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

# Bump this when the normalizer's public output changes in a way that
# warrants re-backfilling affected rows. The backfill script reads this and
# skips rows whose stored `normalized_version` already matches.
NORMALIZER_VERSION = 1


@dataclass(frozen=True)
class LocationNorm:
    """Parsed form of a raw location string. All fields optional."""

    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    is_remote: bool = False


# ---------------------------------------------------------------------------
# Country synonym table → ISO 3166-1 alpha-2
#
# Keep this small and biased toward where student-internship roles actually
# appear (US > CA > UK > India > Ireland > Germany > Netherlands > Australia >
# France). Add entries when we see real misses in production, not speculatively.
# ---------------------------------------------------------------------------

_COUNTRY_MAP: dict[str, str] = {
    "us": "US",
    "u.s.": "US",
    "u.s.a.": "US",
    "usa": "US",
    "united states": "US",
    "united states of america": "US",
    "canada": "CA",
    "uk": "GB",
    "u.k.": "GB",
    "united kingdom": "GB",
    "britain": "GB",
    "great britain": "GB",
    "england": "GB",
    "scotland": "GB",
    "wales": "GB",
    "ireland": "IE",
    "republic of ireland": "IE",
    "india": "IN",
    "germany": "DE",
    "france": "FR",
    "netherlands": "NL",
    "the netherlands": "NL",
    "holland": "NL",
    "australia": "AU",
    "new zealand": "NZ",
    "japan": "JP",
    "singapore": "SG",
    "brazil": "BR",
    "mexico": "MX",
    "spain": "ES",
    "italy": "IT",
    "sweden": "SE",
    "norway": "NO",
    "denmark": "DK",
    "finland": "FI",
    "switzerland": "CH",
    "israel": "IL",
    "poland": "PL",
    "portugal": "PT",
}


# US states — accept both 2-letter USPS and full names. Values are the
# canonical 2-letter form we store.
_US_STATES: dict[str, str] = {
    "AL": "AL", "ALABAMA": "AL",
    "AK": "AK", "ALASKA": "AK",
    "AZ": "AZ", "ARIZONA": "AZ",
    "AR": "AR", "ARKANSAS": "AR",
    "CA": "CA", "CALIFORNIA": "CA",
    "CO": "CO", "COLORADO": "CO",
    "CT": "CT", "CONNECTICUT": "CT",
    "DE": "DE", "DELAWARE": "DE",
    "DC": "DC", "DISTRICT OF COLUMBIA": "DC", "WASHINGTON DC": "DC", "WASHINGTON D.C.": "DC",
    "FL": "FL", "FLORIDA": "FL",
    "GA": "GA", "GEORGIA": "GA",
    "HI": "HI", "HAWAII": "HI",
    "ID": "ID", "IDAHO": "ID",
    "IL": "IL", "ILLINOIS": "IL",
    "IN": "IN", "INDIANA": "IN",
    "IA": "IA", "IOWA": "IA",
    "KS": "KS", "KANSAS": "KS",
    "KY": "KY", "KENTUCKY": "KY",
    "LA": "LA", "LOUISIANA": "LA",
    "ME": "ME", "MAINE": "ME",
    "MD": "MD", "MARYLAND": "MD",
    "MA": "MA", "MASSACHUSETTS": "MA",
    "MI": "MI", "MICHIGAN": "MI",
    "MN": "MN", "MINNESOTA": "MN",
    "MS": "MS", "MISSISSIPPI": "MS",
    "MO": "MO", "MISSOURI": "MO",
    "MT": "MT", "MONTANA": "MT",
    "NE": "NE", "NEBRASKA": "NE",
    "NV": "NV", "NEVADA": "NV",
    "NH": "NH", "NEW HAMPSHIRE": "NH",
    "NJ": "NJ", "NEW JERSEY": "NJ",
    "NM": "NM", "NEW MEXICO": "NM",
    "NY": "NY", "NEW YORK": "NY",
    "NC": "NC", "NORTH CAROLINA": "NC",
    "ND": "ND", "NORTH DAKOTA": "ND",
    "OH": "OH", "OHIO": "OH",
    "OK": "OK", "OKLAHOMA": "OK",
    "OR": "OR", "OREGON": "OR",
    "PA": "PA", "PENNSYLVANIA": "PA",
    "RI": "RI", "RHODE ISLAND": "RI",
    "SC": "SC", "SOUTH CAROLINA": "SC",
    "SD": "SD", "SOUTH DAKOTA": "SD",
    "TN": "TN", "TENNESSEE": "TN",
    "TX": "TX", "TEXAS": "TX",
    "UT": "UT", "UTAH": "UT",
    "VT": "VT", "VERMONT": "VT",
    "VA": "VA", "VIRGINIA": "VA",
    "WA": "WA", "WASHINGTON": "WA",
    "WV": "WV", "WEST VIRGINIA": "WV",
    "WI": "WI", "WISCONSIN": "WI",
    "WY": "WY", "WYOMING": "WY",
}


# Canadian provinces.
_CA_PROVINCES: dict[str, str] = {
    "AB": "AB", "ALBERTA": "AB",
    "BC": "BC", "BRITISH COLUMBIA": "BC",
    "MB": "MB", "MANITOBA": "MB",
    "NB": "NB", "NEW BRUNSWICK": "NB",
    "NL": "NL", "NEWFOUNDLAND AND LABRADOR": "NL", "NEWFOUNDLAND": "NL",
    "NS": "NS", "NOVA SCOTIA": "NS",
    "NT": "NT", "NORTHWEST TERRITORIES": "NT",
    "NU": "NU", "NUNAVUT": "NU",
    "ON": "ON", "ONTARIO": "ON",
    "PE": "PE", "PRINCE EDWARD ISLAND": "PE",
    "QC": "QC", "QUEBEC": "QC", "QUÉBEC": "QC",
    "SK": "SK", "SASKATCHEWAN": "SK",
    "YT": "YT", "YUKON": "YT",
}


# Remote keywords — if any of these appears in the lowercased raw string, the
# role is considered remote-capable for the coarse `is_remote` filter. The
# existing `remote_type` column (remote/hybrid/onsite) carries finer signal.
_REMOTE_TOKENS: frozenset[str] = frozenset(
    {
        "remote",
        "anywhere",
        "worldwide",
        "fully remote",
        "wfh",
        "work from home",
        "hybrid",  # hybrid counts as remote-capable for the coarse filter
        "distributed",
    }
)

# Regex to find remote tokens with word-boundary correctness. "remote-first"
# should match, but "pre-moter" (hypothetical) should not. We build this from
# the token set at import time.
_REMOTE_RE = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _REMOTE_TOKENS) + r")\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Company suffix table. Order matters: check longest first so "Technologies"
# wins over "Technology" etc. All entries are lowercased; matching happens on
# the lowercased input with a leading separator (comma or whitespace) to avoid
# chopping mid-word.
# ---------------------------------------------------------------------------

_COMPANY_SUFFIXES: tuple[str, ...] = (
    ", incorporated",
    " incorporated",
    ", corporation",
    " corporation",
    ", technologies",
    " technologies",
    ", technology",
    " technology",
    ", limited",
    " limited",
    ", holdings",
    " holdings",
    ", group",
    " group",
    ", gmbh",
    " gmbh",
    ", inc.",
    " inc.",
    ", inc",
    " inc",
    ", llc.",
    " llc.",
    ", llc",
    " llc",
    ", ltd.",
    " ltd.",
    ", ltd",
    " ltd",
    ", corp.",
    " corp.",
    ", corp",
    " corp",
    ", plc.",
    " plc.",
    ", plc",
    " plc",
    ", co.",
    " co.",
    ", co",
    " co",
    ", sa",
    " sa",
    ", ag",
    " ag",
    ", ab",
    " ab",
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def normalize_location(raw: Optional[str], source: str = "") -> LocationNorm:
    """Parse a raw location string into city, region, country, is_remote.

    Deliberately deterministic and offline. Never raises; returns an all-null
    LocationNorm on unparseable input.

    Examples:
        "San Francisco, CA"    -> city="San Francisco", region="CA", country="US", is_remote=False
        "Remote"               -> is_remote=True, rest null
        "Remote - US"          -> is_remote=True, country="US"
        "London, UK"           -> city="London", country="GB"
        "Toronto, Ontario"     -> city="Toronto", region="ON", country="CA"
        "Hybrid - NYC"         -> is_remote=True (hybrid counts), city="NYC"
        ""                     -> all null
    """
    if not raw:
        return LocationNorm()
    text = raw.strip()
    if not text:
        return LocationNorm()

    # Remote detection uses the ORIGINAL text — we want "Remote" anywhere in
    # the string to count, even if it's mid-token like "Remote (US)".
    is_remote = bool(_REMOTE_RE.search(text))

    # Strip remote keywords and common separators for the city/region parse.
    # "Remote - US" -> "US", "Remote, San Francisco, CA" -> "San Francisco, CA".
    scrubbed = _REMOTE_RE.sub(" ", text)
    # Drop "(US)" / "[worldwide]" style annotations after the remote strip.
    scrubbed = re.sub(r"[()\[\]]", " ", scrubbed)
    # Collapse common separators to comma for parsing.
    scrubbed = re.sub(r"\s+[-–—/]\s+", ", ", scrubbed)
    # Normalize whitespace and separators.
    scrubbed = re.sub(r"\s*,\s*", ", ", scrubbed)
    scrubbed = re.sub(r"\s+", " ", scrubbed).strip(" ,")

    if not scrubbed:
        return LocationNorm(is_remote=is_remote)

    parts = [p.strip() for p in scrubbed.split(",") if p.strip()]

    # Walk parts right-to-left, greedily identifying country, then region,
    # then whatever's left as city.
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

    remaining = list(parts)

    # Country detection from the last segment.
    if remaining:
        last_lower = remaining[-1].lower()
        if last_lower in _COUNTRY_MAP:
            country = _COUNTRY_MAP[last_lower]
            remaining.pop()

    # Region detection from the new last segment.
    if remaining:
        last_upper = remaining[-1].upper()
        if last_upper in _US_STATES:
            region = _US_STATES[last_upper]
            if country is None:
                country = "US"
            remaining.pop()
        elif last_upper in _CA_PROVINCES:
            region = _CA_PROVINCES[last_upper]
            if country is None:
                country = "CA"
            remaining.pop()

    # Whatever's left, join with a comma — some cities have commas in their
    # display name (rare, but "Kansas City, Kansas" etc. handled by earlier
    # state pop; any leftover multi-part is joined back for robustness).
    if remaining:
        joined = ", ".join(remaining).strip()
        if joined:
            city = joined

    return LocationNorm(city=city, region=region, country=country, is_remote=is_remote)


def normalize_company(raw: Optional[str], source: str = "") -> str:
    """Canonicalize a company name.

    Steps:
      1. None/empty  -> "".
      2. Strip common corporate suffixes ("Inc.", "LLC", "Corp", "GmbH", ...).
      3. Lowercase.
      4. Strip trailing/leading punctuation and whitespace.
      5. Collapse internal whitespace.
      6. Preserve hyphens within tokens ("t-mobile" stays "t-mobile").

    For sources that expose only a URL slug (Lever), the caller is expected
    to pass the titlecased slug as `raw` — we don't titlecase here. If the
    caller passes "", we return "".

    Examples:
        "Stripe, Inc."        -> "stripe"
        "Ramp Inc"            -> "ramp"
        "T-Mobile"            -> "t-mobile"
        "Meta Platforms"      -> "meta platforms"
        "Booking.com B.V."    -> "booking.com"  (B.V. not in suffix list; acceptable)
        None                  -> ""
    """
    if not raw:
        return ""

    text = raw.strip()
    if not text:
        return ""

    lower = text.lower()

    # Strip suffixes (longest first by construction of _COMPANY_SUFFIXES).
    # Loop in case the input ends with multiple stackable suffixes (rare,
    # e.g. "Foo Holdings Ltd"). Cap at two passes to avoid pathological input.
    for _ in range(2):
        stripped_any = False
        for suffix in _COMPANY_SUFFIXES:
            if lower.endswith(suffix):
                lower = lower[: -len(suffix)].rstrip(" ,.")
                stripped_any = True
                break
        if not stripped_any:
            break

    # Strip trailing punctuation and whitespace; collapse internal whitespace.
    lower = re.sub(r"[,;:]+$", "", lower).strip()
    lower = re.sub(r"\s+", " ", lower)

    return lower


_TITLE_TRAILING_LOCATION_RE = re.compile(
    r"\s+[-–—/|]\s+(remote|hybrid|onsite|us|usa|eu|uk|emea|apac|"
    r"anywhere|worldwide|distributed|fully remote|wfh|"
    r"new york|nyc|sf|sfo|san francisco|seattle|boston|london|berlin|toronto)\b.*$",
    re.IGNORECASE,
)

_TITLE_BRACKETED_RE = re.compile(r"\([^)]*\)|\[[^\]]*\]|\{[^}]*\}")

# Title abbreviation expansions. Same caveat as in normalize_company:
# matching is on the lowercased input; word boundaries prevent over-eager
# expansion. `eng` → `engineer` is intentional (catches "Sr Backend Eng")
# even though it leaves "Eng Manager" / "Engineering Manager" non-collapsing
# — that's a known asymmetry, see PR 2 design doc §5.2.
_TITLE_ABBREV_RE: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bsr\.?\b", re.IGNORECASE), "senior"),
    (re.compile(r"\bjr\.?\b", re.IGNORECASE), "junior"),
    (re.compile(r"\bmgr\.?\b", re.IGNORECASE), "manager"),
    (re.compile(r"\beng\.?\b(?!ineer)", re.IGNORECASE), "engineer"),
    (re.compile(r"\bdev\.?\b(?!eloper|ops)", re.IGNORECASE), "developer"),
    (re.compile(r"\s+&\s+"), " and "),
)


def normalize_title(raw: Optional[str], source: str = "") -> str:
    """Canonicalize a job title for cross-source dedup.

    Lowercase. Strips bracket/paren content, trailing location/remote hints,
    and expands common abbreviations (sr → senior, jr → junior, mgr →
    manager, eng → engineer, dev → developer). Preserves seniority
    distinctions — "Senior Engineer" and "Engineer" intentionally stay
    different so PR 2's posting_key doesn't collapse genuinely different
    roles.

    Examples:
        "Senior Software Engineer (Remote, US)"  -> "senior software engineer"
        "Sr. Backend Engineer"                   -> "senior backend engineer"
        "Staff Engineer - Remote"                -> "staff engineer"
        "ML & Data Engineer"                     -> "ml and data engineer"
        ""                                       -> ""
        None                                     -> ""
    """
    if not raw:
        return ""
    text = raw.strip()
    if not text:
        return ""
    # Strip bracketed content first so abbreviations inside don't expand.
    text = _TITLE_BRACKETED_RE.sub(" ", text)
    # Strip trailing location/remote hints.
    text = _TITLE_TRAILING_LOCATION_RE.sub("", text)
    # Expand abbreviations.
    for pattern, replacement in _TITLE_ABBREV_RE:
        text = pattern.sub(replacement, text)
    text = text.lower()
    # Keep alphanumerics and spaces; collapse the rest.
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def should_mark_remote(remote_type: Optional[str], location_is_remote: bool) -> bool:
    """Reconcile the remote_type text signal with the location-derived bool.

    The parser layer has access to remote_type (from scanning title + body,
    not just the raw location) which is often more accurate than scanning
    the location string alone. This helper returns the final
    `location_is_remote` boolean the parser should store.

    True if either signal fires remote-capable. Used by parsers at write-time.
    """
    if remote_type in ("remote", "hybrid"):
        return True
    return bool(location_is_remote)

/**
 * Unit tests for the filter-url codec (facets ↔ URLSearchParams).
 * Pure functions — no DOM/React, no network.
 */
import { describe, it, expect } from "vitest";
import {
  facetsFromSearchParams,
  searchParamsFromFacets,
  facetsToQueryString,
  mergeFacetsIntoQueryString,
} from "../filter-url";
import { DEFAULT_FACETS, type DiscoverFacets } from "../filter-results";

// ─── facetsFromSearchParams ────────────────────────────────────────────────────

describe("facetsFromSearchParams", () => {
  it("returns DEFAULT_FACETS for empty URLSearchParams", () => {
    const result = facetsFromSearchParams(new URLSearchParams(""));
    expect(result).toEqual(DEFAULT_FACETS);
  });

  it("decodes all facet params correctly (round-trip source)", () => {
    const sp = new URLSearchParams(
      "f_remote=hybrid&f_levels=intern,senior&f_sources=ats&f_salary=80000",
    );
    const result = facetsFromSearchParams(sp);
    expect(result).toEqual<DiscoverFacets>({
      remote: "hybrid",
      levels: ["intern", "senior"],
      sources: ["ats"],
      minSalary: 80_000,
    });
  });

  it("ignores unknown remote value and falls back to 'any'", () => {
    const sp = new URLSearchParams("f_remote=INVALID_GARBAGE");
    const result = facetsFromSearchParams(sp);
    expect(result.remote).toBe("any");
  });

  it("ignores unknown level values and keeps valid ones", () => {
    const sp = new URLSearchParams("f_levels=senior,BOGUS,mid");
    const result = facetsFromSearchParams(sp);
    expect(result.levels).toEqual(["senior", "mid"]);
  });

  it("ignores unknown source values", () => {
    const sp = new URLSearchParams("f_sources=ats,BOGUS");
    const result = facetsFromSearchParams(sp);
    expect(result.sources).toEqual(["ats"]);
  });

  it("treats negative salary as 0", () => {
    const sp = new URLSearchParams("f_salary=-9999");
    const result = facetsFromSearchParams(sp);
    expect(result.minSalary).toBe(0);
  });

  it("treats NaN salary as 0", () => {
    const sp = new URLSearchParams("f_salary=notanumber");
    const result = facetsFromSearchParams(sp);
    expect(result.minSalary).toBe(0);
  });

  it("floors fractional salary values", () => {
    const sp = new URLSearchParams("f_salary=75000.9");
    const result = facetsFromSearchParams(sp);
    expect(result.minSalary).toBe(75_000);
  });

  it("ignores completely unrelated params", () => {
    const sp = new URLSearchParams("q=engineer&sort=recent&page=2");
    const result = facetsFromSearchParams(sp);
    expect(result).toEqual(DEFAULT_FACETS);
  });
});

// ─── searchParamsFromFacets ────────────────────────────────────────────────────

describe("searchParamsFromFacets", () => {
  it("returns empty object for DEFAULT_FACETS", () => {
    expect(searchParamsFromFacets(DEFAULT_FACETS)).toEqual({});
  });

  it("omits keys at default values", () => {
    const facets: DiscoverFacets = {
      ...DEFAULT_FACETS,
      remote: "remote",
    };
    const out = searchParamsFromFacets(facets);
    expect(out).toHaveProperty("f_remote", "remote");
    expect(out).not.toHaveProperty("f_levels");
    expect(out).not.toHaveProperty("f_sources");
    expect(out).not.toHaveProperty("f_salary");
  });

  it("encodes levels as comma-joined string", () => {
    const facets: DiscoverFacets = {
      ...DEFAULT_FACETS,
      levels: ["intern", "new_grad"],
    };
    expect(searchParamsFromFacets(facets)).toHaveProperty(
      "f_levels",
      "intern,new_grad",
    );
  });

  it("encodes sources as comma-joined string", () => {
    const facets: DiscoverFacets = {
      ...DEFAULT_FACETS,
      sources: ["ats", "scraper"],
    };
    expect(searchParamsFromFacets(facets)).toHaveProperty(
      "f_sources",
      "ats,scraper",
    );
  });

  it("encodes minSalary as string", () => {
    const facets: DiscoverFacets = { ...DEFAULT_FACETS, minSalary: 120_000 };
    expect(searchParamsFromFacets(facets)).toHaveProperty(
      "f_salary",
      "120000",
    );
  });
});

// ─── facetsToQueryString ──────────────────────────────────────────────────────

describe("facetsToQueryString", () => {
  it("returns empty string for DEFAULT_FACETS", () => {
    expect(facetsToQueryString(DEFAULT_FACETS)).toBe("");
  });

  it("round-trips a non-empty facet set", () => {
    const original: DiscoverFacets = {
      remote: "onsite",
      levels: ["mid", "senior"],
      sources: ["ats"],
      minSalary: 60_000,
    };
    const qs = facetsToQueryString(original);
    expect(qs).not.toBe("");
    const decoded = facetsFromSearchParams(new URLSearchParams(qs));
    expect(decoded).toEqual(original);
  });

  it("produces deterministic output for the same facets", () => {
    const facets: DiscoverFacets = {
      remote: "remote",
      levels: ["intern"],
      sources: [],
      minSalary: 0,
    };
    expect(facetsToQueryString(facets)).toBe(facetsToQueryString(facets));
  });
});

// ─── mergeFacetsIntoQueryString ───────────────────────────────────────────────

describe("mergeFacetsIntoQueryString", () => {
  it("preserves existing non-facet params", () => {
    const result = mergeFacetsIntoQueryString(
      "q=engineer&sort=recent&page=3",
      DEFAULT_FACETS,
    );
    const sp = new URLSearchParams(result);
    expect(sp.get("q")).toBe("engineer");
    expect(sp.get("sort")).toBe("recent");
    expect(sp.get("page")).toBe("3");
  });

  it("removes stale facet keys when facets reset to default", () => {
    const existing = "q=swe&f_remote=hybrid&f_levels=senior&f_salary=100000";
    const result = mergeFacetsIntoQueryString(existing, DEFAULT_FACETS);
    const sp = new URLSearchParams(result);
    expect(sp.get("f_remote")).toBeNull();
    expect(sp.get("f_levels")).toBeNull();
    expect(sp.get("f_salary")).toBeNull();
    // non-facet param preserved
    expect(sp.get("q")).toBe("swe");
  });

  it("overwrites stale facet keys with new values", () => {
    const existing = "f_remote=onsite&f_levels=senior";
    const newFacets: DiscoverFacets = {
      remote: "remote",
      levels: ["intern"],
      sources: [],
      minSalary: 0,
    };
    const result = mergeFacetsIntoQueryString(existing, newFacets);
    const sp = new URLSearchParams(result);
    expect(sp.get("f_remote")).toBe("remote");
    expect(sp.get("f_levels")).toBe("intern");
  });

  it("produces clean URL when all facets and existing QS are empty", () => {
    const result = mergeFacetsIntoQueryString("", DEFAULT_FACETS);
    expect(result).toBe("");
  });
});

/**
 * URL ↔ DiscoverFacets codec.
 *
 * Param names use a `f_` prefix to avoid collisions with the existing
 * DiscoverFilters params (q, skills, remote, company, days, sort, page).
 *
 * Param map:
 *   f_remote   — "any" | "remote" | "hybrid" | "onsite"
 *   f_levels   — comma-joined list of LevelFacet values
 *   f_sources  — comma-joined list of SourceFacet values
 *   f_salary   — integer, 0 = any
 */
import {
  DEFAULT_FACETS,
  type DiscoverFacets,
  type LevelFacet,
  type RemoteFacet,
  type SourceFacet,
} from "./filter-results";

const VALID_REMOTE = new Set<RemoteFacet>(["any", "remote", "hybrid", "onsite"]);
const VALID_LEVELS = new Set<LevelFacet>(["intern", "new_grad", "mid", "senior"]);
const VALID_SOURCES = new Set<SourceFacet>(["ats", "scraper"]);

/**
 * Decode DiscoverFacets from URLSearchParams.
 * Unknown / malformed values are silently ignored and replaced with defaults.
 */
export function facetsFromSearchParams(sp: URLSearchParams): DiscoverFacets {
  // remote
  const remoteRaw = sp.get("f_remote") ?? "any";
  const remote: RemoteFacet = VALID_REMOTE.has(remoteRaw as RemoteFacet)
    ? (remoteRaw as RemoteFacet)
    : "any";

  // levels (comma-joined)
  const levels: LevelFacet[] = (sp.get("f_levels") ?? "")
    .split(",")
    .map((v) => v.trim() as LevelFacet)
    .filter((v) => VALID_LEVELS.has(v));

  // sources (comma-joined)
  const sources: SourceFacet[] = (sp.get("f_sources") ?? "")
    .split(",")
    .map((v) => v.trim() as SourceFacet)
    .filter((v) => VALID_SOURCES.has(v));

  // minSalary
  const salaryRaw = Number(sp.get("f_salary") ?? 0);
  const minSalary =
    Number.isFinite(salaryRaw) && salaryRaw >= 0 ? Math.floor(salaryRaw) : 0;

  return { remote, levels, sources, minSalary };
}

/**
 * Encode DiscoverFacets into URLSearchParams key=value pairs.
 * Default / empty values are omitted to keep URLs clean.
 * Returns an object whose entries can be spread into an existing URLSearchParams.
 */
export function searchParamsFromFacets(facets: DiscoverFacets): Record<string, string> {
  const out: Record<string, string> = {};

  if (facets.remote !== "any") {
    out["f_remote"] = facets.remote;
  }
  if (facets.levels.length > 0) {
    out["f_levels"] = facets.levels.join(",");
  }
  if (facets.sources.length > 0) {
    out["f_sources"] = facets.sources.join(",");
  }
  if (facets.minSalary > 0) {
    out["f_salary"] = String(facets.minSalary);
  }

  return out;
}

/**
 * Serialize facets to a query-string fragment (no leading "?").
 * Returns "" when all facets are at defaults — avoids polluting the URL.
 */
export function facetsToQueryString(facets: DiscoverFacets): string {
  const entries = searchParamsFromFacets(facets);
  const sp = new URLSearchParams(entries);
  return sp.toString();
}

/**
 * Merge facet params into an existing URLSearchParams string, removing stale
 * facet keys first so a clear-all produces a clean URL.
 */
export function mergeFacetsIntoQueryString(
  existingQs: string,
  facets: DiscoverFacets,
): string {
  const sp = new URLSearchParams(existingQs);

  // Remove stale facet keys
  sp.delete("f_remote");
  sp.delete("f_levels");
  sp.delete("f_sources");
  sp.delete("f_salary");

  // Write new values
  const next = searchParamsFromFacets(facets);
  for (const [k, v] of Object.entries(next)) {
    sp.set(k, v);
  }

  return sp.toString();
}

/** Restore DEFAULT_FACETS — convenience re-export so callers don't need to import both files. */
export { DEFAULT_FACETS };

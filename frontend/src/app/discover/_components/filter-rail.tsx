"use client";
/**
 * Faceted filter rail for /discover. Operates entirely on the
 * already-loaded results array — no API refetch, no debounce required.
 *
 * Sticky aside on lg+ screens; bottom-sheet trigger on small screens.
 */
import { useId, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FACETS,
  areFacetsDefault,
  hasSalaryData,
  type DiscoverFacets,
  type LevelFacet,
  type RemoteFacet,
  type SourceFacet,
} from "@/lib/discover/filter-results";
import type { CachedJob } from "@/types";

interface FilterRailProps {
  facets: DiscoverFacets;
  onChange: (next: DiscoverFacets) => void;
  /** All loaded results — used to know whether to render the salary facet. */
  allJobs: CachedJob[];
  /** Filtered count, for the live "Showing X of Y" label. */
  filteredCount: number;
  totalCount: number;
}

const REMOTE_OPTIONS: { value: RemoteFacet; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const LEVEL_OPTIONS: { value: LevelFacet; label: string }[] = [
  { value: "intern", label: "Intern" },
  { value: "new_grad", label: "New grad" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
];

const SOURCE_OPTIONS: { value: SourceFacet; label: string }[] = [
  { value: "ats", label: "Official (Greenhouse / Lever / Ashby)" },
  { value: "scraper", label: "Scraped (Indeed)" },
];

function FilterRailContent({
  facets,
  onChange,
  allJobs,
  filteredCount,
  totalCount,
}: FilterRailProps) {
  const remoteId = useId();
  const salaryId = useId();
  const showSalary = hasSalaryData(allJobs);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-zinc-100">Filters</p>
        <p
          className="text-[11px] tabular-nums text-zinc-400"
          aria-live="polite"
        >
          {filteredCount} of {totalCount}
        </p>
      </div>

      {/* Remote */}
      <fieldset className="space-y-1.5">
        <legend className="text-[11px] uppercase tracking-wide text-zinc-500">
          Remote type
        </legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={remoteId}>
          <span id={remoteId} className="sr-only">Remote type</span>
          {REMOTE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={facets.remote === value}
              onClick={() => onChange({ ...facets, remote: value })}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
                facets.remote === value
                  ? "border-blue-500 bg-blue-500/15 text-blue-200"
                  : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Level */}
      <fieldset className="space-y-1.5">
        <legend className="text-[11px] uppercase tracking-wide text-zinc-500">
          Level
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {LEVEL_OPTIONS.map(({ value, label }) => {
            const selected = facets.levels.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange({ ...facets, levels: toggle(facets.levels, value) })
                }
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
                  selected
                    ? "border-blue-500 bg-blue-500/15 text-blue-200"
                    : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-600",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Source */}
      <fieldset className="space-y-1.5">
        <legend className="text-[11px] uppercase tracking-wide text-zinc-500">
          Source
        </legend>
        <div className="space-y-1">
          {SOURCE_OPTIONS.map(({ value, label }) => {
            const selected = facets.sources.includes(value);
            return (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    onChange({
                      ...facets,
                      sources: toggle(facets.sources, value),
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900 accent-blue-500"
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Salary (only if any data) */}
      {showSalary ? (
        <div className="space-y-1.5">
          <label
            htmlFor={salaryId}
            className="block text-[11px] uppercase tracking-wide text-zinc-500"
          >
            Min salary: {facets.minSalary > 0 ? `$${facets.minSalary.toLocaleString()}` : "any"}
          </label>
          <input
            id={salaryId}
            type="range"
            min={0}
            max={250000}
            step={5000}
            value={facets.minSalary}
            onChange={(e) =>
              onChange({ ...facets, minSalary: Number(e.target.value) })
            }
            className="w-full accent-blue-500"
          />
        </div>
      ) : null}

      {!areFacetsDefault(facets) ? (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FACETS)}
          className="inline-flex items-center gap-1 rounded text-[11px] text-zinc-400 hover:text-zinc-100"
        >
          <X aria-hidden="true" className="h-3 w-3" />
          Clear all
        </button>
      ) : null}
    </div>
  );
}

export function FilterRail(props: FilterRailProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-200 lg:hidden"
        aria-label="Open filters"
      >
        <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
        Filters
        {!areFacetsDefault(props.facets) ? (
          <span className="ml-1 rounded-full bg-blue-500/20 px-1.5 text-[10px] text-blue-200">
            on
          </span>
        ) : null}
      </button>

      {/* Mobile sheet */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-xl border-t border-zinc-800 bg-zinc-950 p-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="rounded p-1 text-zinc-400 hover:text-zinc-100"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <FilterRailContent {...props} />
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside
        className="sticky top-4 hidden h-fit w-56 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 lg:block"
        aria-label="Filters"
      >
        <FilterRailContent {...props} />
      </aside>
    </>
  );
}

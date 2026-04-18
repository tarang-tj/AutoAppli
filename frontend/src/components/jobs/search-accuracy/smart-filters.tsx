"use client";

/**
 * SmartFilters — compact controls panel for /jobs.
 *
 * Layout:
 *   row 1 (toolbar, always visible):
 *     [search input] [Remote ▾] [Seniority ▾] [Sort ▾] [More ▾] [Clear all]
 *   row 2 (active-filter pills, rendered only when filters are dirty):
 *     [Remote ×] [Senior ×] [≥ $100k ×] [Python ×] …
 *   row 3 (collapsible "More" drawer, hidden by default):
 *     min salary, hide-applied, searchable skills picker, saved searches.
 *
 * State shape is unchanged — same `SmartFilterState` emitted to the parent
 * so /jobs/page.tsx doesn't need any changes.
 */

import * as React from "react";
import { groupByCategory, SKILLS, skillLabel, type SkillCategory } from "@/lib/match";
import type { SavedSearchFilters } from "@/lib/match/saved-searches";
import {
  listSavedSearches,
  upsertSavedSearch,
  deleteSavedSearch,
  type SavedSearch,
} from "@/lib/match/saved-searches";

export type SmartFilterState = SavedSearchFilters;

export interface SmartFiltersProps {
  value: SmartFilterState;
  onChange: (next: SmartFilterState) => void;
  /** Skills the candidate has — used to highlight "on your resume" chips. */
  candidateSkills?: string[];
  /** Whether the parent computed match scores (gates the Match sort option). */
  hasMatchScores?: boolean;
  className?: string;
}

/** Default / cleared state — matches INITIAL_FILTERS in /jobs/page.tsx. */
const EMPTY_FILTERS: SmartFilterState = {
  query: "",
  remoteType: "any",
  seniority: null,
  skills: [],
  hideApplied: false,
  salaryMin: null,
  sortBy: "match",
};

const REMOTE_OPTIONS: Array<{ value: SmartFilterState["remoteType"]; label: string }> = [
  { value: "any", label: "Any location" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const SENIORITY_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Any level" },
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "principal", label: "Principal" },
  { value: "manager", label: "Manager" },
];

const SORT_OPTIONS: Array<{ value: SmartFilterState["sortBy"]; label: string }> = [
  { value: "match", label: "Best match" },
  { value: "recency", label: "Most recent" },
  { value: "salary", label: "Highest salary" },
];

/** Human labels keyed by filter value, for pill rendering. */
const SENIORITY_LABEL: Record<string, string> = Object.fromEntries(
  SENIORITY_OPTIONS.filter((o) => o.value).map((o) => [o.value as string, o.label])
);
const REMOTE_LABEL: Record<string, string> = Object.fromEntries(
  REMOTE_OPTIONS.map((o) => [o.value ?? "any", o.label])
);

/** True when any filter (excluding sortBy, which is an ordering) is non-default. */
function isDirty(s: SmartFilterState): boolean {
  return (
    (s.query ?? "").trim().length > 0 ||
    (s.remoteType ?? "any") !== "any" ||
    s.seniority != null ||
    (s.skills?.length ?? 0) > 0 ||
    Boolean(s.hideApplied) ||
    s.salaryMin != null
  );
}

/** True when any filter hidden inside the "More" drawer is active. */
function hasDrawerFilters(s: SmartFilterState): boolean {
  return (s.skills?.length ?? 0) > 0 || s.salaryMin != null || Boolean(s.hideApplied);
}

export function SmartFilters({
  value,
  onChange,
  candidateSkills = [],
  hasMatchScores = false,
  className = "",
}: SmartFiltersProps) {
  const [savedSearches, setSavedSearches] = React.useState<SavedSearch[]>([]);
  const [skillSearch, setSkillSearch] = React.useState("");
  // Auto-expand on mount if there are already active drawer-only filters so
  // the user can see them at a glance (e.g. from a loaded saved search).
  const [showMore, setShowMore] = React.useState(() => hasDrawerFilters(value));
  const [saveName, setSaveName] = React.useState("");

  React.useEffect(() => {
    setSavedSearches(listSavedSearches());
  }, []);

  function patch(p: Partial<SmartFilterState>) {
    onChange({ ...value, ...p });
  }

  function toggleSkill(name: string) {
    const current = new Set(value.skills ?? []);
    if (current.has(name)) current.delete(name);
    else current.add(name);
    patch({ skills: Array.from(current) });
  }

  function clearAll() {
    // Preserve the user's sort choice — it's not really a filter.
    onChange({ ...EMPTY_FILTERS, sortBy: value.sortBy ?? "match" });
    setSkillSearch("");
  }

  function handleSave() {
    if (!saveName.trim()) return;
    const updated = upsertSavedSearch({ name: saveName.trim(), filters: value });
    setSavedSearches([updated, ...savedSearches.filter((s) => s.id !== updated.id)]);
    setSaveName("");
  }

  function handleLoad(s: SavedSearch) {
    onChange(s.filters);
    // If the loaded search includes drawer filters, pop the drawer open.
    if (hasDrawerFilters(s.filters)) setShowMore(true);
  }

  function handleDelete(id: string) {
    deleteSavedSearch(id);
    setSavedSearches(savedSearches.filter((s) => s.id !== id));
  }

  // Build skill list: candidate's own first, then rest alphabetical. Then
  // filter case-insensitively by the inline search input.
  const candidateSet = new Set(candidateSkills);
  const allSkills = SKILLS.map((s) => s.name);
  const orderedSkills = [
    ...candidateSkills.filter((s) => allSkills.includes(s)),
    ...allSkills.filter((s) => !candidateSet.has(s)).sort(),
  ];
  const needle = skillSearch.trim().toLowerCase();
  const filteredSkills = needle
    ? orderedSkills.filter(
        (s) =>
          s.toLowerCase().includes(needle) ||
          skillLabel(s).toLowerCase().includes(needle)
      )
    : orderedSkills;
  const skillsByCategory = groupByCategory(filteredSkills);

  const dirty = isDirty(value);
  const activeSkillCount = value.skills?.length ?? 0;
  const drawerActiveCount =
    (value.salaryMin != null ? 1 : 0) +
    (value.hideApplied ? 1 : 0) +
    activeSkillCount;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 ${className}`}
    >
      {/* ── Toolbar row ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value.query ?? ""}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="Search role, company, keyword…"
          className="min-w-[200px] flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <select
          value={value.remoteType ?? "any"}
          onChange={(e) =>
            patch({ remoteType: e.target.value as SmartFilterState["remoteType"] })
          }
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Remote type"
        >
          {REMOTE_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? "any"}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={value.seniority ?? ""}
          onChange={(e) => patch({ seniority: e.target.value || null })}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Seniority"
        >
          {SENIORITY_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={value.sortBy ?? "match"}
          onChange={(e) =>
            patch({ sortBy: e.target.value as SmartFilterState["sortBy"] })
          }
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((opt) => (
            <option
              key={opt.label}
              value={opt.value}
              disabled={opt.value === "match" && !hasMatchScores}
            >
              Sort: {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-expanded={showMore}
        >
          {showMore ? "Less" : "More"} filters
          {drawerActiveCount > 0 ? ` · ${drawerActiveCount}` : ""}
        </button>

        {dirty && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded px-2.5 py-1.5 text-sm text-zinc-500 hover:text-red-600 hover:underline focus:outline-none"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Active filter pills ──────────────────────── */}
      {dirty && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(value.query ?? "").trim() && (
            <FilterPill
              label={`Search: "${value.query}"`}
              onRemove={() => patch({ query: "" })}
            />
          )}
          {(value.remoteType ?? "any") !== "any" && (
            <FilterPill
              label={REMOTE_LABEL[value.remoteType ?? "any"]}
              onRemove={() => patch({ remoteType: "any" })}
            />
          )}
          {value.seniority && (
            <FilterPill
              label={SENIORITY_LABEL[value.seniority] ?? value.seniority}
              onRemove={() => patch({ seniority: null })}
            />
          )}
          {value.salaryMin != null && (
            <FilterPill
              label={`≥ $${Math.round(value.salaryMin / 1000)}k`}
              onRemove={() => patch({ salaryMin: null })}
            />
          )}
          {value.hideApplied && (
            <FilterPill
              label="Hide applied"
              onRemove={() => patch({ hideApplied: false })}
            />
          )}
          {(value.skills ?? []).map((s) => (
            <FilterPill
              key={s}
              label={skillLabel(s)}
              onRemove={() => toggleSkill(s)}
            />
          ))}
        </div>
      )}

      {/* ── More-filters drawer ──────────────────────── */}
      {showMore && (
        <div className="mt-2 flex flex-col gap-3 border-t border-zinc-100 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Min salary (k)
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={
                  value.salaryMin == null ? "" : Math.round(value.salaryMin / 1000)
                }
                onChange={(e) =>
                  patch({
                    salaryMin:
                      e.target.value === "" ? null : Number(e.target.value) * 1000,
                  })
                }
                placeholder="any"
                className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={Boolean(value.hideApplied)}
                onChange={(e) => patch({ hideApplied: e.target.checked })}
                className="rounded border-zinc-300"
              />
              Hide jobs I&apos;ve already applied to
            </label>
          </div>

          {/* ── Skills picker with inline search ──────── */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <label className="text-xs font-medium text-zinc-700 whitespace-nowrap">
                Skills{activeSkillCount > 0 ? ` · ${activeSkillCount}` : ""}
              </label>
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Filter skills…"
                className="w-48 rounded border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(Object.keys(skillsByCategory) as SkillCategory[])
                .filter((cat) => skillsByCategory[cat].length > 0)
                .map((cat) => (
                  <div key={cat}>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">
                      {cat}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {skillsByCategory[cat].map((s) => {
                        const active = (value.skills ?? []).includes(s);
                        const owned = candidateSet.has(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSkill(s)}
                            className={`text-xs rounded px-2 py-0.5 border transition-colors ${
                              active
                                ? "bg-blue-600 text-white border-blue-600"
                                : owned
                                ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400"
                                : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
                            }`}
                            title={owned ? "On your resume" : undefined}
                          >
                            {skillLabel(s)}
                            {owned && <span className="ml-1">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {filteredSkills.length === 0 && (
                <div className="text-xs text-zinc-400 py-2">
                  No skills match &quot;{skillSearch}&quot;.
                </div>
              )}
            </div>
          </div>

          {/* ── Saved searches ──────────────────────── */}
          <div className="border-t border-zinc-100 pt-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Save these filters as…"
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="rounded bg-zinc-900 px-2.5 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {savedSearches.length > 0 && (
              <div className="mt-2 space-y-1">
                {savedSearches.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded border border-zinc-200 px-2 py-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(s)}
                      className="flex-1 text-left text-zinc-800 hover:text-blue-700"
                    >
                      {s.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="ml-2 text-zinc-400 hover:text-red-600"
                      aria-label={`Delete ${s.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Dismissible pill chip used in the active-filter row. */
function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 hover:text-blue-900"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

export default SmartFilters;

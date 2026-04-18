"use client";

/**
 * SmartFilters — controls panel for the upgraded /jobs search page.
 *
 * Manages: keyword query (with synonym expansion via taxonomy), remote type,
 * seniority, "skills I have" toggle, hide-applied toggle, salary floor,
 * and sort mode. Lifted state — emits a `SmartFilterState` to its parent.
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
  /** Skills the candidate has — used to populate the "skills I have" filter. */
  candidateSkills?: string[];
  /** Whether the parent computed match scores (used to enable Match sort). */
  hasMatchScores?: boolean;
  className?: string;
}

const REMOTE_OPTIONS: Array<{ value: SmartFilterState["remoteType"]; label: string }> = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const SENIORITY_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Any" },
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

export function SmartFilters({
  value,
  onChange,
  candidateSkills = [],
  hasMatchScores = false,
  className = "",
}: SmartFiltersProps) {
  const [savedSearches, setSavedSearches] = React.useState<SavedSearch[]>([]);
  const [showAllSkills, setShowAllSkills] = React.useState(false);
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

  function handleSave() {
    if (!saveName.trim()) return;
    const updated = upsertSavedSearch({ name: saveName.trim(), filters: value });
    setSavedSearches([updated, ...savedSearches.filter((s) => s.id !== updated.id)]);
    setSaveName("");
  }

  function handleLoad(s: SavedSearch) {
    onChange(s.filters);
  }

  function handleDelete(id: string) {
    deleteSavedSearch(id);
    setSavedSearches(savedSearches.filter((s) => s.id !== id));
  }

  // Skill suggestions: candidate's own skills first, then alphabetical canonical list
  const candidateSet = new Set(candidateSkills);
  const allSkills = SKILLS.map((s) => s.name);
  const orderedSkills = [
    ...candidateSkills.filter((s) => allSkills.includes(s)),
    ...allSkills.filter((s) => !candidateSet.has(s)).sort(),
  ];
  const visibleSkills = showAllSkills ? orderedSkills : orderedSkills.slice(0, 18);
  const skillsByCategory = groupByCategory(visibleSkills);

  return (
    <div className={`flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 ${className}`}>
      <div>
        <label className="block text-xs font-medium text-zinc-700 mb-1">Search</label>
        <input
          type="text"
          value={value.query ?? ""}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="role, company, keyword…"
          className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Remote</label>
          <div className="flex flex-wrap gap-1">
            {REMOTE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => patch({ remoteType: opt.value })}
                className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                  (value.remoteType ?? "any") === (opt.value ?? "any")
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Seniority</label>
          <select
            value={value.seniority ?? ""}
            onChange={(e) => patch({ seniority: e.target.value || null })}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {SENIORITY_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value ?? ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Min salary (k)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={value.salaryMin ?? ""}
            onChange={(e) => patch({ salaryMin: e.target.value === "" ? null : Number(e.target.value) * 1000 })}
            placeholder="any"
            className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Sort by</label>
          <select
            value={value.sortBy ?? "match"}
            onChange={(e) => patch({ sortBy: e.target.value as SmartFilterState["sortBy"] })}
            disabled={!hasMatchScores && value.sortBy === "match"}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value} disabled={opt.value === "match" && !hasMatchScores}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={Boolean(value.hideApplied)}
          onChange={(e) => patch({ hideApplied: e.target.checked })}
          className="rounded border-zinc-300"
        />
        Hide jobs I've already applied to
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-700">Skills</label>
          <button
            type="button"
            onClick={() => setShowAllSkills((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showAllSkills ? "Show less" : `Show all (${SKILLS.length})`}
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(Object.keys(skillsByCategory) as SkillCategory[])
            .filter((cat) => skillsByCategory[cat].length > 0)
            .map((cat) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{cat}</div>
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
        </div>
      </div>

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
              <div key={s.id} className="flex items-center justify-between rounded border border-zinc-200 px-2 py-1 text-xs">
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
  );
}

export default SmartFilters;

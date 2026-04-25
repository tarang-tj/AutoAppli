"use client";
/**
 * Filter sidebar for the Discover page.
 *
 * Holds the full query shape (search, skills, remote, company, posted window,
 * sort) in parent state — this component is fully controlled so that the
 * URL can be the real source of truth for sharing links. Parent owns the
 * useState/useSearchParams wiring; we just render the inputs and emit an
 * updated `DiscoverFilters` object via onChange.
 *
 * Skills + companies are supplied by the parent (they come from the
 * separate `fetchTopCachedJobSkills()` / `fetchCachedJobCompanies()` calls
 * so we don't re-query them on every keystroke).
 */
import { useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CachedJobSort } from "@/lib/supabase/cached-jobs";

export interface DiscoverFilters {
  search: string;
  skills: string[];
  remoteType: "" | "remote" | "hybrid" | "onsite";
  company: string;
  postedWithinDays: number; // 0 means "any time"
  sort: CachedJobSort;
}

export const DISCOVER_DEFAULT_FILTERS: DiscoverFilters = {
  search: "",
  skills: [],
  remoteType: "",
  company: "",
  postedWithinDays: 0,
  sort: "recent",
};

interface DiscoverFiltersPanelProps {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
  /** Skill chips to show in the "Top skills" quick-pick. */
  topSkills: { skill: string; count: number }[];
  /** Company options for the datalist. */
  companies: string[];
  /** Count of matching jobs for the current filter set (rendered in header). */
  totalCount?: number;
  /** Whether the first page of results is still loading. */
  isLoading?: boolean;
}

const POSTED_WINDOWS: { label: string; value: number }[] = [
  { label: "Any time", value: 0 },
  { label: "Past 24h", value: 1 },
  { label: "Past week", value: 7 },
  { label: "Past 30d", value: 30 },
];

const SORT_OPTIONS: { label: string; value: CachedJobSort; hint: string }[] = [
  { label: "Recent", value: "recent", hint: "Most recently seen" },
  { label: "Posted", value: "posted", hint: "Most recent posting date" },
  { label: "Newest", value: "newest", hint: "Newly discovered" },
];

const REMOTE_OPTIONS: { label: string; value: "" | "remote" | "hybrid" | "onsite" }[] = [
  { label: "Any", value: "" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
];

export function DiscoverFiltersPanel({
  filters,
  onChange,
  topSkills,
  companies,
  totalCount,
  isLoading,
}: DiscoverFiltersPanelProps) {
  // Local buffer for the typed skill input so a mid-word keystroke doesn't
  // try to add a skill on every render.
  const [skillDraft, setSkillDraft] = useState("");

  const patch = (p: Partial<DiscoverFilters>) => onChange({ ...filters, ...p });
  const reset = () => onChange(DISCOVER_DEFAULT_FILTERS);

  const addSkill = (raw: string) => {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return;
    if (filters.skills.includes(normalized)) return;
    patch({ skills: [...filters.skills, normalized] });
    setSkillDraft("");
  };

  const removeSkill = (s: string) =>
    patch({ skills: filters.skills.filter((x) => x !== s) });

  // Don't show a skill in the quick-pick if it's already been selected.
  const quickPicks = useMemo(
    () => topSkills.filter((s) => !filters.skills.includes(s.skill)).slice(0, 16),
    [topSkills, filters.skills],
  );

  const hasActive =
    filters.search.trim() !== "" ||
    filters.skills.length > 0 ||
    filters.remoteType !== "" ||
    filters.company.trim() !== "" ||
    filters.postedWithinDays > 0 ||
    filters.sort !== "recent";

  return (
    <aside
      aria-label="Discover filters"
      className="flex w-full flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 lg:sticky lg:top-6 lg:w-72 lg:self-start"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <Filter aria-hidden="true" className="h-4 w-4 text-zinc-400" /> Filters
        </h2>
        <span className="text-xs text-zinc-500" role="status" aria-live="polite">
          {isLoading
            ? "Loading…"
            : typeof totalCount === "number"
              ? `${totalCount.toLocaleString()} match${totalCount === 1 ? "" : "es"}`
              : ""}
        </span>
      </header>

      {/* Search */}
      <div className="space-y-1.5">
        <Label htmlFor="discover-search" className="text-xs text-zinc-400">
          Search title or company
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            id="discover-search"
            name="discover-search"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="e.g. staff engineer"
            autoComplete="off"
            className="h-9 pl-8"
          />
        </div>
      </div>

      {/* Remote type */}
      <fieldset className="space-y-1.5">
        <legend className="text-xs text-zinc-400">Work setting</legend>
        <div className="grid grid-cols-4 gap-1">
          {REMOTE_OPTIONS.map((opt) => {
            const optionId = `discover-remote-${opt.value || "any"}`;
            const selected = filters.remoteType === opt.value;
            return (
              <label
                key={opt.value || "any"}
                htmlFor={optionId}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors text-center cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950",
                  selected
                    ? "border-blue-600/60 bg-blue-600/10 text-blue-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200",
                )}
              >
                <input
                  type="radio"
                  id={optionId}
                  name="discover-remote-type"
                  value={opt.value}
                  checked={selected}
                  onChange={() => patch({ remoteType: opt.value })}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Skills */}
      <div className="space-y-1.5">
        <Label htmlFor="discover-skill-input" className="text-xs text-zinc-400">
          Required skills
        </Label>
        <Input
          id="discover-skill-input"
          name="discover-skill-input"
          value={skillDraft}
          onChange={(e) => setSkillDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addSkill(skillDraft);
            } else if (e.key === "Backspace" && !skillDraft && filters.skills.length) {
              removeSkill(filters.skills[filters.skills.length - 1]);
            }
          }}
          placeholder="Type and press Enter"
          autoComplete="off"
          aria-describedby="discover-skill-hint"
          className="h-9"
        />
        <p id="discover-skill-hint" className="sr-only">
          Press Enter or comma to add a skill. Press Backspace on an empty field to remove the last skill.
        </p>
        {filters.skills.length > 0 && (
          <ul aria-label="Selected skills" className="flex flex-wrap gap-1 pt-1 list-none p-0">
            {filters.skills.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  aria-label={`Remove skill ${s}`}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-700/40 bg-blue-600/10 px-2 py-0.5 text-[11px] text-blue-200 hover:bg-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {s} <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {quickPicks.length > 0 && (
          <div className="pt-1">
            <p id="discover-popular-skills-label" className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
              Popular
            </p>
            <ul aria-labelledby="discover-popular-skills-label" className="flex flex-wrap gap-1 list-none p-0">
              {quickPicks.map(({ skill, count }) => (
                <li key={skill}>
                  <button
                    type="button"
                    onClick={() => addSkill(skill)}
                    aria-label={`Add skill ${skill} (${count} listing${count === 1 ? "" : "s"})`}
                    className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    {skill}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <Label htmlFor="discover-company" className="text-xs text-zinc-400">
          Company
        </Label>
        <Input
          id="discover-company"
          name="discover-company"
          value={filters.company}
          onChange={(e) => patch({ company: e.target.value })}
          list="discover-company-options"
          placeholder="Any company"
          autoComplete="off"
          className="h-9"
        />
        <datalist id="discover-company-options">
          {companies.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Posted window */}
      <fieldset className="space-y-1.5">
        <legend className="text-xs text-zinc-400">Posted</legend>
        <div className="grid grid-cols-2 gap-1">
          {POSTED_WINDOWS.map((opt) => {
            const optionId = `discover-posted-${opt.value}`;
            const selected = filters.postedWithinDays === opt.value;
            return (
              <label
                key={opt.value}
                htmlFor={optionId}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors text-center cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950",
                  selected
                    ? "border-blue-600/60 bg-blue-600/10 text-blue-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200",
                )}
              >
                <input
                  type="radio"
                  id={optionId}
                  name="discover-posted-within"
                  value={opt.value}
                  checked={selected}
                  onChange={() => patch({ postedWithinDays: opt.value })}
                  className="sr-only"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Sort */}
      <fieldset className="space-y-1.5">
        <legend className="text-xs text-zinc-400">Sort</legend>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => {
            const optionId = `discover-sort-${opt.value}`;
            const selected = filters.sort === opt.value;
            return (
              <label
                key={opt.value}
                htmlFor={optionId}
                className={cn(
                  "flex w-full items-baseline justify-between rounded-md border px-2.5 py-1.5 text-left transition-colors cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-zinc-950",
                  selected
                    ? "border-blue-600/60 bg-blue-600/10 text-blue-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700",
                )}
              >
                <input
                  type="radio"
                  id={optionId}
                  name="discover-sort"
                  value={opt.value}
                  checked={selected}
                  onChange={() => patch({ sort: opt.value })}
                  className="sr-only"
                />
                <span className="text-[12px] font-medium">{opt.label}</span>
                <span className="text-[10px] text-zinc-500">{opt.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        disabled={!hasActive}
        className="justify-start text-zinc-400 hover:text-zinc-100"
      >
        Reset filters
      </Button>
    </aside>
  );
}

"use client";
/**
 * Client half of /discover. Owns filter state, URL sync, Supabase reads,
 * and the "save to kanban" action. Kept separate from page.tsx so the
 * server file can stay static/metadata-only.
 *
 * URL-as-state contract:
 *   ?q=…        — title/company search
 *   ?skills=…   — comma-joined list (lowercased)
 *   ?remote=…   — remote | hybrid | onsite
 *   ?company=…
 *   ?days=…     — 1 | 7 | 30 (0/missing = any)
 *   ?sort=…     — recent | posted | newest
 *   ?page=…     — 1-indexed for humans, converted to 0-indexed offset
 *
 * Every mutation of the filter shape updates the URL via router.replace so
 * pagination + filters survive refresh + share. We deliberately avoid
 * `router.push` to keep the back button pointing at the page the user
 * arrived from rather than each filter keystroke.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DiscoverCard } from "@/components/discover/discover-card";
import { useMatchScores } from "@/hooks/use-match-scores";
import {
  DiscoverFiltersPanel,
  DISCOVER_DEFAULT_FILTERS,
  type DiscoverFilters,
} from "@/components/discover/discover-filters";
import { RecommendationsRail } from "@/components/discover/recommendations-rail";
import {
  useCachedJobs,
  useCachedJobCompanies,
  useTopCachedJobSkills,
} from "@/hooks/use-cached-jobs";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createJob } from "@/lib/supabase/jobs";
import { cn } from "@/lib/utils";
import type { CachedJob, Job } from "@/types";

const PAGE_SIZE = 24;

// ─── URL ⇄ filter-state bridge ──────────────────────────────────────
function filtersFromSearchParams(sp: URLSearchParams): {
  filters: DiscoverFilters;
  page: number;
} {
  const sortRaw = sp.get("sort");
  const sort =
    sortRaw === "posted" || sortRaw === "newest" ? sortRaw : "recent";
  const remoteRaw = sp.get("remote");
  const remoteType: DiscoverFilters["remoteType"] =
    remoteRaw === "remote" || remoteRaw === "hybrid" || remoteRaw === "onsite"
      ? remoteRaw
      : "";
  const daysRaw = Number(sp.get("days") ?? 0);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 0;
  const pageRaw = Number(sp.get("page") ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  return {
    filters: {
      search: sp.get("q") ?? "",
      skills: (sp.get("skills") ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      remoteType,
      company: sp.get("company") ?? "",
      postedWithinDays: days,
      sort,
    },
    page,
  };
}

function searchParamsFromFilters(f: DiscoverFilters, page: number): string {
  const sp = new URLSearchParams();
  if (f.search.trim()) sp.set("q", f.search.trim());
  if (f.skills.length) sp.set("skills", f.skills.join(","));
  if (f.remoteType) sp.set("remote", f.remoteType);
  if (f.company.trim()) sp.set("company", f.company.trim());
  if (f.postedWithinDays > 0) sp.set("days", String(f.postedWithinDays));
  if (f.sort !== "recent") sp.set("sort", f.sort);
  if (page > 1) sp.set("page", String(page));
  return sp.toString();
}

// ─── Main client view ──────────────────────────────────────────────
export function DiscoverClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [filters, setFilters] = useState<DiscoverFilters>(initial.filters);
  const [page, setPage] = useState<number>(initial.page);

  // Sync the URL whenever the filter or page changes.
  const urlStringFromState = useMemo(
    () => searchParamsFromFilters(filters, page),
    [filters, page],
  );
  const lastPushedRef = useRef<string>(urlStringFromState);
  useEffect(() => {
    if (lastPushedRef.current === urlStringFromState) return;
    lastPushedRef.current = urlStringFromState;
    const qs = urlStringFromState ? `?${urlStringFromState}` : "";
    router.replace(`/discover${qs}`, { scroll: false });
  }, [urlStringFromState, router]);

  // Reset to page 1 whenever the filter shape changes. Skips reset if the
  // user is explicitly paginating (tracked by `isPaginatingRef`) and on the
  // very first mount (so the page can be primed from the URL).
  const isPaginatingRef = useRef(false);
  const filterMountRef = useRef(false);
  useEffect(() => {
    if (!filterMountRef.current) {
      filterMountRef.current = true;
      return;
    }
    if (isPaginatingRef.current) {
      isPaginatingRef.current = false;
      return;
    }
    setPage(1);
  }, [
    filters.search,
    filters.skills,
    filters.remoteType,
    filters.company,
    filters.postedWithinDays,
    filters.sort,
  ]);

  const { rows, total, isLoading, error, mutate, configured } = useCachedJobs({
    search: filters.search,
    skills: filters.skills,
    remoteType: filters.remoteType || undefined,
    company: filters.company || undefined,
    postedWithinDays: filters.postedWithinDays || undefined,
    sort: filters.sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const { skills: topSkills } = useTopCachedJobSkills(30);
  const { companies } = useCachedJobCompanies();

  // Match scores against the user's primary resume. Returns empty when no
  // resume on file — DiscoverCard renders no badge in that case, so the
  // surface degrades gracefully for users who haven't uploaded one yet.
  const { scores: matchScores, isLoading: scoresLoading } = useMatchScores();

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The Recommendations rail only shows on the unfiltered default view. The
  // moment a user tweaks a filter, the page becomes about "what they asked
  // for", not "what we'd suggest" — stacking both would feel conflicting.
  const filtersAreDefault =
    !filters.search.trim() &&
    filters.skills.length === 0 &&
    !filters.remoteType &&
    !filters.company.trim() &&
    filters.postedWithinDays === 0;
  const showRail = filtersAreDefault && page === 1;

  // ── Signed-in state (used to gate Save + show "On your board") ──
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (!cancelled) setUserId(data.user?.id ?? null);
      } catch {
        /* ignore — treat as signed out */
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pull the user's existing `jobs` URLs so we can render already-saved
  // cards in the "On your board" state. One query per page load — cheap
  // at typical board sizes (< a few hundred).
  const [savedByUrl, setSavedByUrl] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!userId) {
      setSavedByUrl(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await createClient()
          .from("jobs")
          .select("id, url");
        if (err || !data) return;
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const row of data as { id: string; url: string | null }[]) {
          if (row.url) m.set(row.url, row.id);
        }
        setSavedByUrl(m);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Save-to-kanban action ─────────────────────────────────────────
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const handleSave = useCallback(
    async (job: CachedJob) => {
      if (!userId) {
        toast.error("Sign in to save jobs to your board.");
        return;
      }
      if (savedByUrl.has(job.url)) {
        toast.info("Already on your board");
        return;
      }
      setSavingIds((prev) => new Set(prev).add(job.id));
      try {
        const saved: Job = await createJob({
          company: job.company,
          title: job.title,
          url: job.url,
          description: job.description,
          source: job.source,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          location: job.location,
          remote_type: job.remote_type ?? "unknown",
          skills: job.skills,
          tags: job.tags,
        });
        setSavedByUrl((prev) => {
          const next = new Map(prev);
          next.set(job.url, saved.id);
          return next;
        });
        if (saved.duplicate) {
          toast.info("That posting is already on your board");
        } else {
          toast.success(`Saved "${job.title}" to kanban`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }
    },
    [userId, savedByUrl],
  );

  // ── Pagination handlers ──
  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(pageCount, nextPage));
    if (clamped === page) return;
    isPaginatingRef.current = true;
    setPage(clamped);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ── Render ──
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-blue-400">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Discover
          </div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl text-balance">
            A curated firehose of open roles
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400 text-pretty">
            Refreshed nightly from public ATS feeds across Greenhouse, Lever,
            Ashby, Workable, SmartRecruiters, and WeWorkRemotely. Save anything
            you want to track to your AutoAppli kanban with one click.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            aria-label="Refresh job listings"
            className="gap-1.5 text-zinc-300"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
          </Button>
          {sessionChecked && !userId && (
            <Link
              href="/login?next=/discover"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "no-underline",
              )}
            >
              Sign in to save jobs
            </Link>
          )}
        </div>
      </header>

      {/* Supabase-not-configured warning */}
      {!configured && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-200"
        >
          <p className="font-medium">Supabase isn&apos;t configured for this build.</p>
          <p className="mt-1 text-amber-300/80">
            Discover reads directly from the cached_jobs table. Set
            NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to see live
            listings here.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-xl border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-200"
        >
          Couldn&apos;t load jobs: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Personalized rail — default view only */}
      {showRail && (
        <RecommendationsRail
          savedByUrl={savedByUrl}
          savingIds={savingIds}
          onSave={handleSave}
        />
      )}

      {/* Filters + results */}
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <DiscoverFiltersPanel
          filters={filters}
          onChange={setFilters}
          topSkills={topSkills}
          companies={companies}
          totalCount={configured ? total : undefined}
          isLoading={isLoading}
        />

        <section
          className="min-w-0"
          aria-label="Job results"
          aria-busy={isLoading && rows.length === 0}
        >
          {isLoading && rows.length === 0 ? (
            <div
              role="status"
              aria-label="Loading job listings"
              className="grid gap-3 sm:grid-cols-2"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="h-44 animate-pulse rounded-xl bg-zinc-900/40"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              reason={
                !configured
                  ? "no-supabase"
                  : filters.search || filters.skills.length || filters.remoteType || filters.company || filters.postedWithinDays
                    ? "no-matches"
                    : "empty-firehose"
              }
              onReset={() => setFilters(DISCOVER_DEFAULT_FILTERS)}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((job) => (
                  <DiscoverCard
                    key={job.id}
                    job={job}
                    savedJobId={savedByUrl.get(job.url) ?? null}
                    saving={savingIds.has(job.id)}
                    onSave={handleSave}
                    matchScore={matchScores[job.id]}
                    scoreLoading={scoresLoading}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <nav
                  className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400"
                  aria-label="Pagination"
                >
                  <span>
                    Page {page} of {pageCount} ·{" "}
                    <span className="text-zinc-500">
                      {total.toLocaleString()} roles
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      aria-label="Previous page"
                      className="gap-1"
                    >
                      <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount}
                      onClick={() => goToPage(page + 1)}
                      aria-label="Next page"
                      className="gap-1"
                    >
                      Next <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

// ─── Empty state ──────────────────────────────────────────────────
function EmptyState({
  reason,
  onReset,
}: {
  reason: "no-supabase" | "no-matches" | "empty-firehose";
  onReset: () => void;
}) {
  if (reason === "no-supabase") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center">
        <p className="text-sm font-medium text-zinc-300">
          Live listings aren&apos;t available in this build.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Check back when Supabase is wired up.
        </p>
      </div>
    );
  }
  if (reason === "empty-firehose") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center">
        <p className="text-sm font-medium text-zinc-300">
          The firehose is still warming up.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          The nightly ingestion cron runs at 09:00 UTC daily. If the table is
          empty, wait for the next run and refresh.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-10 text-center">
      <p className="text-sm font-medium text-zinc-300">
        No roles match your filters.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Try removing a skill, widening the posted-within window, or clearing
        the company filter.
      </p>
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

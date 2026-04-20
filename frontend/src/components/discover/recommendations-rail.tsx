"use client";
/**
 * Sprint 6 — "Recommended for you" rail.
 *
 * Horizontally-scrolling row of compact cards above the Discover grid. Reads
 * top-12 ranked CachedJob rows from `useRecommendedJobs`, renders a smaller
 * card variant (RecommendationCard) so 4–5 fit per viewport on desktop.
 *
 * State machine:
 *   !configured                 — render nothing (Discover already shows the
 *                                 "configure Supabase" empty state).
 *   loading & nothing cached    — skeleton row.
 *   !hasResume                  — soft CTA card prompting resume upload.
 *   ready & recs.length === 0   — hide rail (no false "we found 0 for you").
 *   ready & recs.length > 0     — render the rail.
 *
 * The parent (discover-client) handles the *visibility* gate when filters are
 * active — that lives there, not here, so this component is pure presentation.
 */
import Link from "next/link";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useRecommendedJobs } from "@/hooks/use-recommended-jobs";
import { cn } from "@/lib/utils";
import type { CachedJob } from "@/types";
import type { RecommendedJob } from "@/lib/recommend";

// ── Public entry ────────────────────────────────────────────────────

interface RecommendationsRailProps {
  /** Map<cached_job.url, jobs.id> — same shape Discover passes to the grid. */
  savedByUrl: Map<string, string>;
  /** Set of cached_job.id values currently saving. Matches the grid's state. */
  savingIds: Set<string>;
  onSave: (job: CachedJob) => void;
}

export function RecommendationsRail({
  savedByUrl,
  savingIds,
  onSave,
}: RecommendationsRailProps) {
  const { recommendations, hasResume, configured, isLoading, ready } =
    useRecommendedJobs();

  if (!configured) return null;

  // Loading state — show a row of skeletons so the page doesn't jump when
  // recommendations land.
  if (isLoading && recommendations.length === 0) {
    return <RailFrame heading="Recommended for you"><SkeletonCards /></RailFrame>;
  }

  // No resume — soft prompt. We deliberately keep the rail mounted so users
  // discover that uploading a resume unlocks personalization.
  if (!isLoading && !hasResume) {
    return (
      <RailFrame heading="Recommended for you">
        <UploadResumeCTA />
      </RailFrame>
    );
  }

  // Have resume + jobs but nothing scored above 0 — hide the rail rather than
  // show "0 matches", which is both depressing and confusing.
  if (ready && recommendations.length === 0) return null;

  return (
    <RailFrame heading="Recommended for you" subheading={subheadingFor(recommendations)}>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        // Hide the native scrollbar on macOS/Linux but keep wheel/swipe.
        style={{ scrollbarWidth: "thin" }}
      >
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.job.id}
            rec={rec}
            savedJobId={savedByUrl.get(rec.job.url) ?? null}
            saving={savingIds.has(rec.job.id)}
            onSave={onSave}
          />
        ))}
      </div>
    </RailFrame>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────

function RailFrame({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          {heading}
        </h2>
        {subheading && (
          <span className="text-xs text-zinc-500">{subheading}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function subheadingFor(recs: RecommendedJob[]): string {
  const top = recs[0]?.score ?? 0;
  return `${recs.length} match${recs.length === 1 ? "" : "es"} • top ${top}%`;
}

function SkeletonCards() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-44 w-72 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950/40"
        />
      ))}
    </div>
  );
}

function UploadResumeCTA() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-zinc-200">
          Upload a resume to unlock personalized recommendations.
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          We score each posting against your skills + remote preference. Nothing leaves your browser.
        </p>
      </div>
      <Link
        href="/resume"
        className={cn(
          buttonVariants({ variant: "default", size: "sm" }),
          "no-underline gap-1.5 shrink-0",
        )}
      >
        <Upload className="h-3.5 w-3.5" /> Upload resume
      </Link>
    </div>
  );
}

// ── Compact recommendation card ─────────────────────────────────────

interface RecommendationCardProps {
  rec: RecommendedJob;
  savedJobId: string | null;
  saving: boolean;
  onSave: (job: CachedJob) => void;
}

function RecommendationCard({
  rec,
  savedJobId,
  saving,
  onSave,
}: RecommendationCardProps) {
  const { job, score, reasons } = rec;
  const isSaved = Boolean(savedJobId);
  const scoreClass = scoreToClass(score);

  return (
    <article
      className={cn(
        "group relative flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4",
        "hover:border-zinc-700 hover:bg-zinc-950/80 transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">
            {job.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-zinc-400">{job.company}</p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px] tabular-nums", scoreClass)}
          title="Match score"
        >
          {score}%
        </Badge>
      </div>

      {/* Reasons — at most 2, chips */}
      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reasons.slice(0, 2).map((r) => (
            <span
              key={r}
              className="rounded-md border border-zinc-800 bg-zinc-900/50 px-1.5 py-0.5 text-[10px] text-zinc-300"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Spacer so actions stick to the bottom regardless of reason count. */}
      <div className="flex-1" />

      <div className="flex items-center gap-1.5 pt-1">
        {isSaved ? (
          <Link
            href={`/dashboard?highlight=${savedJobId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "xs" }),
              "no-underline gap-1",
            )}
          >
            <BookmarkCheck className="h-3 w-3" /> Saved
          </Link>
        ) : (
          <Button
            variant="default"
            size="xs"
            disabled={saving}
            onClick={() => onSave(job)}
            className="gap-1"
          >
            <Bookmark className="h-3 w-3" />
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "xs" }),
            "no-underline gap-1 text-zinc-400",
          )}
        >
          <ExternalLink className="h-3 w-3" /> View
        </a>
      </div>
    </article>
  );
}

function scoreToClass(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-300 border-emerald-700/50";
  if (score >= 60) return "bg-amber-500/10 text-amber-300 border-amber-700/50";
  return "bg-zinc-500/10 text-zinc-300 border-zinc-700/50";
}

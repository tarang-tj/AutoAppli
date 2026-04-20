"use client";
/**
 * A single cached_jobs row rendered as a Discover card.
 *
 * Two primary actions:
 *   - "Save to kanban" → copies the row into the user's public.jobs table
 *     as a bookmarked application.
 *   - "View posting" → opens the original ATS URL in a new tab. rel="noopener"
 *     because cached URLs come from third parties and we don't want them
 *     touching our window.
 *
 * Once a job is saved, the card renders a disabled state with a "View on
 * board" deep link. That lookup is driven by the parent (`savedJobId`) so
 * the card never has to re-query Supabase after the save.
 */
import Link from "next/link";
import { useMemo } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CachedJob } from "@/types";

interface DiscoverCardProps {
  job: CachedJob;
  /** ID in the user's jobs table if they've already saved this posting. */
  savedJobId?: string | null;
  /** Disables Save while a network call is in flight. */
  saving?: boolean;
  onSave?: (job: CachedJob) => void;
}

const REMOTE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};
const REMOTE_CLASSES: Record<string, string> = {
  remote: "bg-emerald-500/10 text-emerald-300 border-emerald-700/50",
  hybrid: "bg-amber-500/10 text-amber-300 border-amber-700/50",
  onsite: "bg-zinc-500/10 text-zinc-300 border-zinc-700/50",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const deltaSec = Math.max(0, (Date.now() - then) / 1000);
  if (deltaSec < 60 * 60) return "just now";
  if (deltaSec < 60 * 60 * 24) return `${Math.floor(deltaSec / 3600)}h ago`;
  const days = Math.floor(deltaSec / 86400);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function descriptionSnippet(raw: string | null | undefined, max: number = 220): string {
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  const cut = compact.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
}

export function DiscoverCard({ job, savedJobId, saving, onSave }: DiscoverCardProps) {
  const isSaved = Boolean(savedJobId);
  const snippet = useMemo(() => descriptionSnippet(job.description), [job.description]);
  const topSkills = (job.skills ?? []).slice(0, 6);
  const remoteLabel = job.remote_type ? REMOTE_LABEL[job.remote_type] : null;
  const remoteClass = job.remote_type ? REMOTE_CLASSES[job.remote_type] : "";
  const posted = relativeTime(job.posted_at);

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5",
        "hover:border-zinc-700 hover:bg-zinc-950/80 transition-colors",
      )}
    >
      {/* Header: title + company + meta */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-100 leading-snug line-clamp-2">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-400 truncate">{job.company}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            {posted && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {posted}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-600">
              via {job.source}
            </span>
          </div>
        </div>

        {remoteLabel && (
          <Badge variant="outline" className={cn("shrink-0 text-[11px]", remoteClass)}>
            {remoteLabel}
          </Badge>
        )}
      </div>

      {/* Body: description snippet */}
      {snippet && (
        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
          {snippet}
        </p>
      )}

      {/* Skill chips */}
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topSkills.map((s) => (
            <span
              key={s}
              className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[11px] text-zinc-300"
            >
              {s}
            </span>
          ))}
          {(job.skills?.length ?? 0) > topSkills.length && (
            <span className="rounded-md px-2 py-0.5 text-[11px] text-zinc-500">
              +{(job.skills?.length ?? 0) - topSkills.length} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-1 flex items-center gap-2 pt-1">
        {isSaved ? (
          <Link
            href={`/dashboard?highlight=${savedJobId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 no-underline",
            )}
          >
            <BookmarkCheck className="h-3.5 w-3.5" /> On your board
          </Link>
        ) : (
          <Button
            variant="default"
            size="sm"
            disabled={saving}
            onClick={() => onSave?.(job)}
            className="gap-1.5"
          >
            <Bookmark className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save to kanban"}
          </Button>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 no-underline",
          )}
        >
          <ExternalLink className="h-3.5 w-3.5" /> View posting
        </a>
      </div>
    </article>
  );
}

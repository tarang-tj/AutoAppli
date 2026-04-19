"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleSlash,
  Ghost,
  Loader2,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClosedReason } from "@/types";
import {
  STALE_THRESHOLD_DEFAULT,
  useStaleJobs,
} from "@/hooks/use-stale-jobs";
import { toast } from "sonner";

/**
 * Custom window event the WeeklyDigest dispatches when its "stale" card
 * is clicked. Keeping this contract here (next to the listener) means
 * both ends reference the same string without a new shared module.
 */
export const OPEN_GHOST_NUDGE_EVENT = "autoappli:open-ghost-nudge";

/** LocalStorage key: stale count the user last dismissed the banner on. */
const DISMISSED_AT_COUNT_KEY = "stale_banner_dismissed_count_v1";

type Props = {
  closeOutJob: (jobId: string, reason: ClosedReason | null) => Promise<void>;
  archiveJob: (jobId: string, archived: boolean) => Promise<void>;
  mutateJobs: () => void;
};

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export function StaleJobsNudge({
  closeOutJob,
  archiveJob,
  mutateJobs,
}: Props) {
  const { staleJobs, threshold, updateThreshold, mutate } = useStaleJobs();
  const [open, setOpen] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dismissedCount, setDismissedCount] = useState<number>(() => {
    if (typeof window === "undefined") return -1;
    try {
      const raw = window.localStorage.getItem(DISMISSED_AT_COUNT_KEY);
      return raw ? parseInt(raw, 10) : -1;
    } catch {
      return -1;
    }
  });

  // Already-closed jobs shouldn't be listed (re-closing a closed job is
  // meaningless). The `/automation/stale` endpoint filters by updated_at
  // only, so we narrow here.
  const actionable = useMemo(
    () => staleJobs.filter((j) => !j.closed_reason),
    [staleJobs]
  );

  // Listen for the "open me" signal from WeeklyDigest.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GHOST_NUDGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GHOST_NUDGE_EVENT, onOpen);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissedCount(actionable.length);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          DISMISSED_AT_COUNT_KEY,
          String(actionable.length)
        );
      } catch {
        /* ignore */
      }
    }
  }, [actionable.length]);

  const withBusy = useCallback(
    async <T,>(jobId: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusyIds((prev) => ({ ...prev, [jobId]: true }));
      try {
        return await fn();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Action failed");
        return undefined;
      } finally {
        setBusyIds((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
      }
    },
    []
  );

  const handleMarkGhosted = useCallback(
    async (jobId: string) => {
      await withBusy(jobId, async () => {
        await closeOutJob(jobId, "no_response");
        await archiveJob(jobId, true);
      });
      mutate();
      mutateJobs();
      toast.success("Marked as ghosted & archived");
    },
    [withBusy, closeOutJob, archiveJob, mutate, mutateJobs]
  );

  const handleReopen = useCallback(
    async (jobId: string) => {
      await withBusy(jobId, async () => {
        await closeOutJob(jobId, null);
      });
      mutate();
      mutateJobs();
      toast.success("Marked as still active");
    },
    [withBusy, closeOutJob, mutate, mutateJobs]
  );

  const handleBulkGhost = useCallback(async () => {
    if (actionable.length === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        actionable.map((j) =>
          (async () => {
            try {
              await closeOutJob(j.id, "no_response");
              await archiveJob(j.id, true);
            } catch {
              /* per-row failure is surfaced below via count mismatch */
            }
          })()
        )
      );
      mutate();
      mutateJobs();
      toast.success(
        `Closed out ${actionable.length} application${
          actionable.length === 1 ? "" : "s"
        }`
      );
      setOpen(false);
    } finally {
      setBulkBusy(false);
    }
  }, [actionable, closeOutJob, archiveJob, mutate, mutateJobs]);

  // Banner visibility: new stale count differs from the count at last
  // dismissal. Hide entirely when there's nothing actionable.
  const showBanner =
    actionable.length > 0 && actionable.length !== dismissedCount;

  return (
    <>
      {showBanner ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
              <Ghost className="h-4 w-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-100">
                {actionable.length} application
                {actionable.length === 1 ? "" : "s"} silent for {threshold}+ days
              </p>
              <p className="text-[11px] text-amber-200/80">
                Probably ghosted. Close them out so your metrics stay honest.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-amber-500/20 border border-amber-500/40 text-amber-100 hover:bg-amber-500/30"
              onClick={() => setOpen(true)}
            >
              Review
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={handleDismiss}
              className="rounded-md p-1.5 text-amber-300/70 hover:bg-amber-500/10 hover:text-amber-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Applications gone quiet
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Active applications not touched in {threshold}+ days.
              Close them out to keep your response-rate and offer-rate
              numbers accurate.
            </DialogDescription>
          </DialogHeader>

          {/* Threshold slider */}
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-950/50 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <Settings className="h-3.5 w-3.5 text-zinc-400" />
                Ghost threshold
              </span>
              <span className="tabular-nums text-zinc-200">
                {threshold} days
              </span>
            </div>
            <input
              type="range"
              min={7}
              max={180}
              step={1}
              value={threshold}
              onChange={(e) => updateThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400"
              aria-label="Ghost threshold in days"
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
              <span>7d</span>
              <span>30d</span>
              <span>60d</span>
              <span>90d</span>
              <span>180d</span>
            </div>
            {threshold !== STALE_THRESHOLD_DEFAULT ? (
              <button
                type="button"
                className="mt-2 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                onClick={() => updateThreshold(STALE_THRESHOLD_DEFAULT)}
              >
                Reset to {STALE_THRESHOLD_DEFAULT} days
              </button>
            ) : null}
          </div>

          {/* Actionable list */}
          <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
            {actionable.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center">
                <Ghost className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
                <p className="text-sm text-zinc-300">
                  Nothing silent past {threshold} days.
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Drop the threshold to catch them earlier.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800 bg-zinc-900/40">
                {actionable.map((job) => {
                  const silentFor = daysSince(job.updated_at);
                  const busy = Boolean(busyIds[job.id]);
                  return (
                    <li key={job.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {job.title}
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
                          <span className="truncate">{job.company}</span>
                          <span aria-hidden>&middot;</span>
                          <Badge
                            variant="outline"
                            className="h-4 border-zinc-700 px-1.5 py-0 text-[9px] uppercase tracking-wide text-zinc-400"
                          >
                            {job.status}
                          </Badge>
                          {silentFor !== null ? (
                            <span className="text-amber-300/80">
                              {silentFor}d silent
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 border-zinc-700 bg-zinc-900/60 px-2 text-[11px] text-zinc-200 hover:bg-zinc-800"
                          onClick={() => handleReopen(job.id)}
                          disabled={busy}
                          title="Still active — don't close out"
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          <span className="ml-1">Still active</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-amber-500/20 border border-amber-500/40 px-2 text-[11px] text-amber-100 hover:bg-amber-500/30"
                          onClick={() => handleMarkGhosted(job.id)}
                          disabled={busy}
                          title="Mark as ghosted and archive"
                        >
                          {busy ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CircleSlash className="h-3 w-3" />
                          )}
                          <span className="ml-1">Ghosted</span>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="bg-amber-500/20 border border-amber-500/40 text-amber-100 hover:bg-amber-500/30"
              disabled={actionable.length === 0 || bulkBusy}
              onClick={handleBulkGhost}
            >
              {bulkBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CircleSlash className="h-3.5 w-3.5 mr-1.5" />
              )}
              Mark all {actionable.length} as ghosted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

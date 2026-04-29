"use client";
import type { ClosedReason, Job, ThankYouResponse, MatchScore } from "@/types";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiPost, isJobsApiConfigured } from "@/lib/api";
import { normalizeJobUrl } from "@/lib/job-url";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArchiveRestore,
  Building2,
  CircleSlash,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Flag,
  Heart,
  Laptop,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { WhyThisMatch } from "@/app/discover/_components/why-this-match";
import {
  storeOutreachHandoffFromJob,
  storeResumeHandoffFromJob,
} from "@/lib/tracker-handoff";
import { toast } from "sonner";

interface JobCardProps {
  job: Job;
  index: number;
  matchScore?: MatchScore;
  onRemove?: () => void | Promise<void>;
  onSaveNotes?: (notes: string) => void | Promise<void>;
  onCloseOut?: (reason: ClosedReason | null) => void | Promise<void>;
  onArchive?: (archived: boolean) => void | Promise<void>;
}

/** Human-readable labels for the 6 close-out reasons. */
const CLOSED_REASON_LABELS: Record<ClosedReason, string> = {
  rejected_by_company: "Rejected by company",
  withdrew: "I withdrew",
  no_response: "No response / ghosted",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  role_closed: "Role was closed",
};

/** Tailwind classes for the close-out badge on the card. */
const CLOSED_REASON_STYLES: Record<ClosedReason, string> = {
  rejected_by_company: "text-red-300 bg-red-500/15 border-red-500/30",
  withdrew: "text-zinc-300 bg-zinc-500/15 border-zinc-500/30",
  no_response: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  offer_accepted: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  offer_declined: "text-sky-300 bg-sky-500/15 border-sky-500/30",
  role_closed: "text-zinc-300 bg-zinc-700/40 border-zinc-600",
};

function MatchBadge({ score }: { score: number }) {
  if (score <= 0) return null;
  const color =
    score >= 70
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 40
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${color}`}
      title={`${score}% resume match`}
      aria-label={`Resume match score: ${score} percent`}
    >
      {score}% fit
    </span>
  );
}

const REMOTE_LABELS: Record<string, { label: string; cls: string }> = {
  remote: { label: "Remote", cls: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" },
  hybrid: { label: "Hybrid", cls: "text-amber-400 bg-amber-500/15 border-amber-500/25" },
  onsite: { label: "Onsite", cls: "text-sky-400 bg-sky-500/15 border-sky-500/25" },
};

function formatSalary(min?: number | null, max?: number | null, currency = "USD"): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\u00A3" : `${currency} `;
  if (min && max) return `${sym}${fmt(min)}\u2013${sym}${fmt(max)}`;
  if (min) return `${sym}${fmt(min)}+`;
  return `up to ${sym}${fmt(max!)}`;
}

function PriorityStars({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-px"
      title={`Priority ${count}/5`}
      aria-label={`Priority ${count} of 5`}
      role="img"
    >
      {Array.from({ length: count }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className="h-2.5 w-2.5 fill-amber-400 text-amber-400"
        />
      ))}
    </span>
  );
}

export function JobCard({
  job,
  index,
  matchScore,
  onRemove,
  onSaveNotes,
  onCloseOut,
  onArchive,
}: JobCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(job.notes ?? "");
  const [removing, setRemoving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [thankYouLoading, setThankYouLoading] = useState(false);
  const [thankYouResult, setThankYouResult] = useState<ThankYouResponse | null>(null);
  const [thankYouWho, setThankYouWho] = useState("");
  const [thankYouNotes, setThankYouNotes] = useState("");
  // Close-out dialog state
  const [closeOutOpen, setCloseOutOpen] = useState(false);
  const [closeOutChoice, setCloseOutChoice] = useState<ClosedReason | "">(
    (job.closed_reason as ClosedReason | null) ?? ""
  );
  const [closeOutAlsoArchive, setCloseOutAlsoArchive] = useState(true);
  const [closingOut, setClosingOut] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const whyMatchId = useId();

  // Re-sync the picker when the dialog opens, so it reflects the current row.
  useEffect(() => {
    if (closeOutOpen) {
      setCloseOutChoice((job.closed_reason as ClosedReason | null) ?? "");
      setCloseOutAlsoArchive(!job.archived);
    }
  }, [closeOutOpen, job.closed_reason, job.archived]);

  const isArchived = Boolean(job.archived);
  const closedReasonLabel = job.closed_reason
    ? CLOSED_REASON_LABELS[job.closed_reason]
    : null;

  const thankYouEligible =
    job.status === "interviewing" || job.status === "offer";

  useEffect(() => {
    if (notesOpen) {
      setDraft(job.notes ?? "");
    }
  }, [notesOpen, job.notes]);

  useEffect(() => {
    if (!thankYouOpen) return;
    setThankYouResult(null);
    setThankYouWho("");
    setThankYouNotes("");
  }, [thankYouOpen]);

  const appliedStamp =
    job.status === "applied" && job.applied_at
      ? new Date(job.applied_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;
  const addedStamp = new Date(job.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const linkHref = normalizeJobUrl(job.url);
  const hasNotes = Boolean(job.notes?.trim());
  const salaryStr = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const remoteInfo = job.remote_type && job.remote_type !== "unknown" ? REMOTE_LABELS[job.remote_type] : null;
  const deadlineDate = job.deadline ? new Date(job.deadline) : null;
  const deadlineStr = deadlineDate
    ? deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const deadlineUrgent = deadlineDate
    ? deadlineDate.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
    : false;

  const handleConfirmRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove();
      setConfirmOpen(false);
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!onSaveNotes) return;
    setSavingNotes(true);
    try {
      await onSaveNotes(draft.trim());
      setNotesOpen(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCloseOutSubmit = async () => {
    if (!onCloseOut) return;
    const reason = (closeOutChoice || null) as ClosedReason | null;
    setClosingOut(true);
    try {
      await onCloseOut(reason);
      // If they opted to also archive and we have the handler, toggle that too.
      if (reason && closeOutAlsoArchive && onArchive && !job.archived) {
        await onArchive(true);
      }
      setCloseOutOpen(false);
    } finally {
      setClosingOut(false);
    }
  };

  const handleReopen = async () => {
    if (!onCloseOut) return;
    setClosingOut(true);
    try {
      await onCloseOut(null);
      // Reopening should also restore from archive if the user does it from the
      // close-out dialog explicitly.
      if (onArchive && job.archived) {
        await onArchive(false);
      }
      setCloseOutOpen(false);
    } finally {
      setClosingOut(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!onArchive) return;
    setArchiving(true);
    try {
      await onArchive(!isArchived);
    } finally {
      setArchiving(false);
    }
  };

  const runThankYou = async () => {
    setThankYouLoading(true);
    try {
      const res = await apiPost<ThankYouResponse>("/outreach/thank-you", {
        job_id: isJobsApiConfigured() ? job.id : undefined,
        job_title: job.title,
        company: job.company,
        interviewer_name: thankYouWho.trim() || undefined,
        interview_notes: thankYouNotes.trim() || undefined,
      });
      setThankYouResult(res);
      toast.success("Thank-you draft ready");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not generate thank-you note");
    } finally {
      setThankYouLoading(false);
    }
  };

  return (
    <>
      <Draggable draggableId={job.id} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className={cn(
              "bg-zinc-900 border-zinc-800 cursor-grab touch-manipulation active:cursor-grabbing select-none transition-opacity",
              isArchived && "opacity-60 hover:opacity-90",
              snapshot.isDragging &&
                "shadow-xl shadow-black/30 ring-1 ring-blue-500/30 opacity-[0.97] z-10"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-50 truncate">{job.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 aria-hidden="true" className="h-3 w-3 shrink-0 text-zinc-400" />
                    <p className="text-xs text-zinc-300 truncate">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {onSaveNotes ? (
                    <button
                      type="button"
                      className={cn(
                        "p-1 -m-1 rounded hover:bg-zinc-800/80",
                        hasNotes ? "text-amber-400/90" : "text-zinc-400 hover:text-zinc-200"
                      )}
                      aria-label={hasNotes ? "Edit notes" : "Add notes"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotesOpen(true);
                      }}
                    >
                      <StickyNote aria-hidden="true" className={cn("h-3.5 w-3.5", hasNotes && "fill-current")} />
                    </button>
                  ) : null}
                  {thankYouEligible ? (
                    <button
                      type="button"
                      title="Draft post-interview thank-you email"
                      aria-label="Draft post-interview thank-you email"
                      className="text-zinc-400 hover:text-rose-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setThankYouOpen(true);
                      }}
                    >
                      <Heart aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title="Open in Resume Builder with this role"
                    aria-label="Open in Resume Builder with this role"
                    className="text-zinc-400 hover:text-violet-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      storeResumeHandoffFromJob(job);
                      router.push(
                        isJobsApiConfigured()
                          ? `/resume?jobId=${encodeURIComponent(job.id)}`
                          : "/resume"
                      );
                    }}
                  >
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Open Outreach with this role"
                    aria-label="Open Outreach with this role"
                    className="text-zinc-400 hover:text-emerald-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      storeOutreachHandoffFromJob(job);
                      router.push(
                        isJobsApiConfigured()
                          ? `/outreach?jobId=${encodeURIComponent(job.id)}`
                          : "/outreach"
                      );
                    }}
                  >
                    <Send aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  {linkHref ? (
                    <a
                      href={linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open job posting in new tab"
                      aria-label={`Open ${job.title} at ${job.company} job posting in new tab`}
                      className="text-zinc-400 hover:text-sky-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  {onCloseOut ? (
                    <button
                      type="button"
                      title={
                        job.closed_reason
                          ? `Closed: ${CLOSED_REASON_LABELS[job.closed_reason]}`
                          : "Close out this role"
                      }
                      aria-label={
                        job.closed_reason ? "Edit close-out" : "Close out role"
                      }
                      className={cn(
                        "p-1 -m-1 rounded hover:bg-zinc-800/80",
                        job.closed_reason
                          ? "text-amber-400/90 hover:text-amber-300"
                          : "text-zinc-400 hover:text-amber-400"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCloseOutOpen(true);
                      }}
                    >
                      <CircleSlash aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {onArchive ? (
                    <button
                      type="button"
                      title={isArchived ? "Restore to board" : "Archive"}
                      aria-label={isArchived ? "Restore to board" : "Archive"}
                      className={cn(
                        "p-1 -m-1 rounded hover:bg-zinc-800/80 disabled:opacity-50",
                        isArchived
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-zinc-400 hover:text-zinc-100"
                      )}
                      disabled={archiving}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleToggleArchive();
                      }}
                    >
                      {isArchived ? (
                        <ArchiveRestore aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                  {onRemove ? (
                    <button
                      type="button"
                      className="text-zinc-400 hover:text-red-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                      aria-label="Remove job"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmOpen(true);
                      }}
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
              {/* ── Rich-field badges row ─────────────── */}
              {(salaryStr || job.location || remoteInfo || job.priority || closedReasonLabel || isArchived) ? (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {job.priority ? <PriorityStars count={job.priority} /> : null}
                  {salaryStr ? (
                    <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold text-emerald-400 tabular-nums">
                      <DollarSign aria-hidden="true" className="h-2.5 w-2.5" />{salaryStr}
                    </span>
                  ) : null}
                  {job.location ? (
                    <span className="inline-flex items-center gap-0.5 rounded border border-zinc-600 bg-zinc-800/60 px-1.5 py-px text-[10px] text-zinc-300">
                      <MapPin aria-hidden="true" className="h-2.5 w-2.5" />{job.location}
                    </span>
                  ) : null}
                  {remoteInfo ? (
                    <span className={cn("inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[10px] font-medium", remoteInfo.cls)}>
                      <Laptop aria-hidden="true" className="h-2.5 w-2.5" />{remoteInfo.label}
                    </span>
                  ) : null}
                  {closedReasonLabel && job.closed_reason ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[10px] font-medium",
                        CLOSED_REASON_STYLES[job.closed_reason]
                      )}
                    >
                      <CircleSlash aria-hidden="true" className="h-2.5 w-2.5" />
                      {closedReasonLabel}
                    </span>
                  ) : null}
                  {isArchived ? (
                    <span className="inline-flex items-center gap-0.5 rounded border border-zinc-600 bg-zinc-800/60 px-1.5 py-px text-[10px] text-zinc-400">
                      <Archive aria-hidden="true" className="h-2.5 w-2.5" />Archived
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* ── Skills / tags row ─────────────── */}
              {(job.skills?.length || job.tags?.length) ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(job.skills ?? []).slice(0, 3).map((s) => (
                    <span key={s} className="rounded bg-violet-500/15 border border-violet-500/25 px-1.5 py-px text-[9px] font-medium text-violet-300">
                      {s}
                    </span>
                  ))}
                  {(job.skills?.length ?? 0) > 3 ? (
                    <span className="text-[9px] text-zinc-500">+{job.skills!.length - 3}</span>
                  ) : null}
                  {(job.tags ?? []).slice(0, 2).map((t) => (
                    <span key={t} className="inline-flex items-center gap-0.5 rounded bg-blue-500/15 border border-blue-500/25 px-1.5 py-px text-[9px] font-medium text-blue-300">
                      <Tag aria-hidden="true" className="h-2 w-2" />{t}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* ── Next step / deadline ──────────── */}
              {(job.next_step || deadlineStr) ? (
                <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                  {job.next_step ? (
                    <span className="inline-flex items-center gap-0.5 text-sky-400 truncate max-w-[60%]">
                      <Flag aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />{job.next_step}
                    </span>
                  ) : null}
                  {deadlineStr ? (
                    <span
                      className={cn("inline-flex items-center gap-0.5 ml-auto", deadlineUrgent ? "text-red-400" : "text-zinc-400")}
                      aria-label={`Deadline ${deadlineStr}${deadlineUrgent ? " (urgent)" : ""}`}
                    >
                      <Clock aria-hidden="true" className="h-2.5 w-2.5" />{deadlineStr}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {hasNotes ? (
                <p className="text-[11px] text-zinc-200 mt-2 line-clamp-2 border-l-2 border-amber-400/70 pl-2 leading-snug">
                  {job.notes}
                </p>
              ) : null}

              {/* ── Match v2 7-signal breakdown (graceful no-op when missing) ── */}
              {matchScore?.explanations ? (
                <WhyThisMatch
                  explanations={matchScore.explanations}
                  id={whyMatchId}
                />
              ) : null}

              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-zinc-500 bg-zinc-950/50 text-zinc-200 font-medium"
                  >
                    {job.source}
                  </Badge>
                  {matchScore && matchScore.score > 0 && (
                    <MatchBadge score={matchScore.score} />
                  )}
                </div>
                <span
                  className="text-[10px] text-zinc-300 tabular-nums text-right leading-tight"
                  title={
                    appliedStamp
                      ? `Applied ${appliedStamp} · Added ${addedStamp}`
                      : `Added ${addedStamp}`
                  }
                >
                  {appliedStamp ? (
                    <>
                      <span className="text-emerald-400/90">Applied {appliedStamp}</span>
                      <span className="text-zinc-500 mx-0.5">·</span>
                      <span className="text-zinc-500">{addedStamp}</span>
                    </>
                  ) : (
                    addedStamp
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </Draggable>

      {onSaveNotes ? (
        <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
          <DialogContent
            className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-white">Notes</DialogTitle>
              <DialogDescription className="text-zinc-300">
                {job.title} · {job.company}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Interview prep, contacts, salary range…"
              aria-label={`Notes for ${job.title} at ${job.company}`}
              className="min-h-[120px] bg-zinc-950 border-zinc-700 text-zinc-100 resize-y"
            />
            <DialogFooter className="border-zinc-800 bg-zinc-900/80 sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 text-zinc-200"
                onClick={() => setNotesOpen(false)}
                disabled={savingNotes}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={savingNotes}
                onClick={() => void handleSaveNotes()}
              >
                {savingNotes ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={thankYouOpen} onOpenChange={setThankYouOpen}>
        <DialogContent
          className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-lg max-h-[90vh] overflow-y-auto"
          showCloseButton
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Thank-you email</DialogTitle>
            <DialogDescription className="text-zinc-300">
              {job.title} · {job.company}
            </DialogDescription>
          </DialogHeader>
          {!thankYouResult ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="thankyou-interviewer" className="text-zinc-300">Interviewer name (optional)</Label>
                <Input
                  id="thankyou-interviewer"
                  value={thankYouWho}
                  onChange={(e) => setThankYouWho(e.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="off"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thankyou-notes" className="text-zinc-300">What to mention (optional)</Label>
                <Textarea
                  id="thankyou-notes"
                  value={thankYouNotes}
                  onChange={(e) => setThankYouNotes(e.target.value)}
                  placeholder="Topics you discussed, why you’re a fit…"
                  rows={3}
                  className="bg-zinc-950 border-zinc-700 text-white resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Subject</p>
                <p className="text-sm text-white">{thankYouResult.subject}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Body</p>
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 max-h-48 overflow-y-auto">
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {thankYouResult.body}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-zinc-800 bg-zinc-900/80 sm:justify-end gap-2 flex-col sm:flex-row">
            {!thankYouResult ? (
              <Button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
                disabled={thankYouLoading}
                onClick={() => void runThankYou()}
              >
                {thankYouLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate draft"
                )}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-200"
                  onClick={() => setThankYouResult(null)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const t = `Subject: ${thankYouResult.subject}\n\n${thankYouResult.body}`;
                    void navigator.clipboard.writeText(t);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy all
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {onCloseOut ? (
        <Dialog open={closeOutOpen} onOpenChange={setCloseOutOpen}>
          <DialogContent
            className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-white">Close out this role</DialogTitle>
              <DialogDescription className="text-zinc-300">
                {job.title} · {job.company}
              </DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <legend className="sr-only">Close-out reason</legend>
              {(Object.keys(CLOSED_REASON_LABELS) as ClosedReason[]).map(
                (reason) => {
                  const selected = closeOutChoice === reason;
                  const optionId = `closeout-reason-${reason}`;
                  return (
                    <label
                      key={reason}
                      htmlFor={optionId}
                      className={cn(
                        "flex w-full items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900",
                        selected
                          ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                          : "border-zinc-700 bg-zinc-950/50 text-zinc-200 hover:bg-zinc-800/60"
                      )}
                    >
                      <input
                        type="radio"
                        id={optionId}
                        name="closeout-reason"
                        value={reason}
                        checked={selected}
                        onChange={() => setCloseOutChoice(reason)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-block h-3 w-3 shrink-0 rounded-full border",
                          selected
                            ? "border-amber-300 bg-amber-400"
                            : "border-zinc-500 bg-transparent"
                        )}
                      />
                      <span>{CLOSED_REASON_LABELS[reason]}</span>
                    </label>
                  );
                }
              )}
            </fieldset>
            {onArchive ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 accent-amber-400"
                  checked={closeOutAlsoArchive}
                  onChange={(e) => setCloseOutAlsoArchive(e.target.checked)}
                />
                Also archive (hide from default board view)
              </label>
            ) : null}
            <DialogFooter className="border-zinc-800 bg-zinc-900/80 sm:justify-between gap-2 flex-col sm:flex-row">
              <div className="flex gap-2 order-2 sm:order-1">
                {job.closed_reason ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-700 text-emerald-300 hover:bg-emerald-900/20"
                    disabled={closingOut}
                    onClick={() => void handleReopen()}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Re-open
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2 order-1 sm:order-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 text-zinc-200"
                  onClick={() => setCloseOutOpen(false)}
                  disabled={closingOut}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={closingOut || !closeOutChoice}
                  onClick={() => void handleCloseOutSubmit()}
                >
                  {closingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Close out"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {onRemove ? (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent
            className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-sm"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle className="text-white">Remove this role?</DialogTitle>
              <DialogDescription className="text-zinc-300">
                {job.title} at {job.company} will be removed from your tracker. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="border-zinc-800 bg-zinc-900/80 sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 text-zinc-200"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={removing}
                onClick={() => void handleConfirmRemove()}
              >
                {removing ? "Removing…" : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

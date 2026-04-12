"use client";
import type { Job, ThankYouResponse } from "@/types";
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
  Building2,
  Copy,
  ExternalLink,
  Heart,
  Loader2,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  storeOutreachHandoffFromJob,
  storeResumeHandoffFromJob,
} from "@/lib/tracker-handoff";
import { toast } from "sonner";

interface JobCardProps {
  job: Job;
  index: number;
  dragDisabled?: boolean;
  onRemove?: () => void | Promise<void>;
  onSaveNotes?: (notes: string) => void | Promise<void>;
}

export function JobCard({ job, index, dragDisabled = false, onRemove, onSaveNotes }: JobCardProps) {
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
      <Draggable draggableId={job.id} index={index} isDragDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className={cn(
              "bg-zinc-900 border-zinc-800 cursor-grab touch-manipulation active:cursor-grabbing select-none",
              snapshot.isDragging &&
                "shadow-xl shadow-black/30 ring-1 ring-blue-500/30 opacity-[0.97] z-10"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-50 truncate">{job.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3 shrink-0 text-zinc-400" />
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
                      <StickyNote className={cn("h-3.5 w-3.5", hasNotes && "fill-current")} />
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
                      <Heart className="h-3.5 w-3.5" />
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
                    <Sparkles className="h-3.5 w-3.5" />
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
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  {linkHref ? (
                    <a
                      href={linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-sky-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
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
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
              {hasNotes ? (
                <p className="text-[11px] text-zinc-200 mt-2 line-clamp-3 border-l-2 border-amber-400/70 pl-2 leading-snug">
                  {job.notes}
                </p>
              ) : null}
              <div className="flex items-center justify-between mt-2 gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] border-zinc-500 bg-zinc-950/50 text-zinc-200 font-medium"
                >
                  {job.source}
                </Badge>
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
                <Label className="text-zinc-300">Interviewer name (optional)</Label>
                <Input
                  value={thankYouWho}
                  onChange={(e) => setThankYouWho(e.target.value)}
                  placeholder="Jane Smith"
                  className="bg-zinc-950 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">What to mention (optional)</Label>
                <Textarea
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

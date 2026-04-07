"use client";
import { Job } from "@/types";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeJobUrl } from "@/lib/job-url";
import { cn } from "@/lib/utils";
import {
  Building2,
  ExternalLink,
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

interface JobCardProps {
  job: Job;
  index: number;
  onRemove?: () => void | Promise<void>;
  onSaveNotes?: (notes: string) => void | Promise<void>;
}

export function JobCard({ job, index, onRemove, onSaveNotes }: JobCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draft, setDraft] = useState(job.notes ?? "");
  const [removing, setRemoving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (notesOpen) {
      setDraft(job.notes ?? "");
    }
  }, [notesOpen, job.notes]);

  const date = new Date(job.created_at).toLocaleDateString("en-US", {
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
                  <button
                    type="button"
                    title="Open in Resume Builder with this role"
                    aria-label="Open in Resume Builder with this role"
                    className="text-zinc-400 hover:text-violet-400 p-1 -m-1 rounded hover:bg-zinc-800/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      storeResumeHandoffFromJob(job);
                      router.push("/resume");
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
                      router.push("/outreach");
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
              <div className="flex items-center justify-between mt-2">
                <Badge
                  variant="outline"
                  className="text-[10px] border-zinc-500 bg-zinc-950/50 text-zinc-200 font-medium"
                >
                  {job.source}
                </Badge>
                <span className="text-[10px] text-zinc-300 tabular-nums">{date}</span>
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

"use client";

import { useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { TimelineEvent, Job } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  Plus,
  Trash2,
  Send,
  Calendar,
  CheckCircle2,
  Star,
  FileText,
  Users,
  MessageSquare,
  Zap,
} from "lucide-react";
import useSWR from "swr";

// ── Event type config ────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  status_change: { label: "Status Change", color: "text-zinc-400", icon: Zap },
  application_sent: { label: "Applied", color: "text-blue-400", icon: Send },
  interview_scheduled: { label: "Interview", color: "text-amber-400", icon: Calendar },
  interview_completed: { label: "Interview Done", color: "text-emerald-400", icon: CheckCircle2 },
  outreach_sent: { label: "Outreach", color: "text-purple-400", icon: MessageSquare },
  offer_received: { label: "Offer", color: "text-emerald-400", icon: Star },
  note: { label: "Note", color: "text-zinc-400", icon: FileText },
  document_generated: { label: "Document", color: "text-cyan-400", icon: FileText },
  contact_added: { label: "Contact", color: "text-blue-400", icon: Users },
  custom: { label: "Custom", color: "text-zinc-400", icon: Clock },
};

// ── Timeline event component ─────────────────────────────────────

function TimelineItem({ event, isManual, onDelete }: { event: TimelineEvent; isManual: boolean; onDelete?: () => void }) {
  const cfg = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.custom;
  const Icon = cfg.icon;
  const date = new Date(event.occurred_at).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cfg.color} bg-zinc-800 border border-zinc-700`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-px flex-1 bg-zinc-800 mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium text-zinc-100">{event.title}</h4>
            <p className="text-xs text-zinc-500 mt-0.5">{date}</p>
          </div>
          {isManual && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 px-1.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Add event form ───────────────────────────────────────────────

function AddEventForm({ jobId, onCreated }: { jobId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/timeline", { job_id: jobId, event_type: "note", title, description });
      setTitle("");
      setDescription("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add Note
      </Button>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="pt-3 pb-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" className="bg-zinc-800 border-zinc-700 text-sm" required />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details…" rows={2} className="bg-zinc-800 border-zinc-700 text-sm" />
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !title.trim()} size="sm">{submitting ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function TimelinePage() {
  const { data: jobs } = useSWR<Job[]>("/jobs", () => apiGet<Job[]>("/jobs"));
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const activeJobs = (jobs || []).filter((j) =>
    ["applied", "interviewing", "offer", "bookmarked"].includes(j.status)
  );

  // Auto-select first active job if none selected
  const effectiveJobId = selectedJobId || activeJobs[0]?.id || "";

  const { data: timeline, mutate: refreshTimeline } = useSWR<TimelineEvent[]>(
    effectiveJobId ? `/timeline/${effectiveJobId}` : null,
    () => (effectiveJobId ? apiGet<TimelineEvent[]>(`/timeline/${effectiveJobId}`) : Promise.resolve([]))
  );

  const selectedJob = (jobs || []).find((j) => j.id === effectiveJobId);

  async function handleDeleteEvent(evtId: string) {
    await apiDelete(`/timeline/${evtId}`);
    refreshTimeline();
  }

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Application Timeline</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Chronological activity log for each job application
        </p>
      </div>

      {/* Job selector */}
      <div className="flex items-center gap-3">
        <select
          className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
          value={effectiveJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
        >
          {activeJobs.length === 0 && <option value="">No active jobs</option>}
          {activeJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} — {j.company} ({j.status})
            </option>
          ))}
        </select>
        {effectiveJobId && (
          <AddEventForm jobId={effectiveJobId} onCreated={refreshTimeline} />
        )}
      </div>

      {/* Selected job summary */}
      {selectedJob && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-zinc-100">{selectedJob.title}</h2>
                <p className="text-xs text-zinc-400">{selectedJob.company} · {selectedJob.status} · {selectedJob.source}</p>
              </div>
              <span className="text-xs text-zinc-500">
                Added {new Date(selectedJob.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {effectiveJobId && (
        <section>
          {!timeline ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-1/3 bg-zinc-800/60 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-10 w-10 text-zinc-600 mb-3" />
                <p className="text-zinc-300 font-medium">No activity yet</p>
                <p className="text-zinc-400 text-sm mt-1 max-w-sm">
                  Events will appear here as you track progress for this job.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-2">
              {(timeline || []).map((evt) => (
                <TimelineItem
                  key={evt.id}
                  event={evt}
                  isManual={evt.id.startsWith("evt-") && !evt.id.startsWith("evt-auto-")}
                  onDelete={() => handleDeleteEvent(evt.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

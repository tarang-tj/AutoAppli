"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { InterviewNote, InterviewPrepMaterial, Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  MessageSquare,
  Lightbulb,
  HelpCircle,
} from "lucide-react";
import useSWR, { mutate } from "swr";

// ── Status styling ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  upcoming: { label: "Upcoming", color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "text-zinc-400", bg: "bg-zinc-400/10", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Prep material display ─────────────────────────────────────────

function PrepSection({ title, icon: Icon, items }: { title: string; icon: typeof Lightbulb; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      <ul className="space-y-1 pl-5 list-disc text-sm text-zinc-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PrepMaterialCard({ prep }: { prep: InterviewPrepMaterial }) {
  return (
    <div className="mt-3 p-4 rounded-lg bg-zinc-800/60 border border-zinc-700 space-y-4">
      {prep.company_overview && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Briefcase className="h-3.5 w-3.5" /> Company Overview
          </h4>
          <p className="text-sm text-zinc-300">{prep.company_overview}</p>
        </div>
      )}
      {prep.role_insights && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Lightbulb className="h-3.5 w-3.5" /> Role Insights
          </h4>
          <p className="text-sm text-zinc-300">{prep.role_insights}</p>
        </div>
      )}
      <PrepSection title="Talking Points" icon={MessageSquare} items={prep.talking_points} />
      <PrepSection title="Likely Questions" icon={HelpCircle} items={prep.likely_questions} />
      <PrepSection title="Questions to Ask" icon={MessageSquare} items={prep.questions_to_ask} />
      <PrepSection title="Tips" icon={Sparkles} items={prep.tips} />
    </div>
  );
}

// ── New interview form ────────────────────────────────────────────

function NewInterviewForm({
  jobs,
  onCreated,
  prefillJobId,
}: {
  jobs: Job[];
  onCreated: () => void;
  prefillJobId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [roundName, setRoundName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-open and pre-select job when linked from job detail page
  useEffect(() => {
    if (prefillJobId && jobs.length > 0) {
      const match = jobs.find((j) => j.id === prefillJobId);
      if (match) {
        setJobId(prefillJobId);
        setOpen(true);
      }
    }
  }, [prefillJobId, jobs]);

  const interviewingJobs = jobs.filter((j) =>
    ["interviewing", "applied", "offer"].includes(j.status)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId) return;
    setSubmitting(true);
    try {
      await apiPost("/interviews", {
        job_id: jobId,
        round_name: roundName || "General",
        scheduled_at: scheduledAt || null,
        interviewer_name: interviewer,
        notes,
      });
      setJobId("");
      setRoundName("");
      setScheduledAt("");
      setInterviewer("");
      setNotes("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add Interview
      </Button>
    );
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Interview Round</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Job *</label>
            <select
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              required
            >
              <option value="">Select a job…</option>
              {interviewingJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Round Name</label>
              <Input
                placeholder="e.g. Phone Screen, Technical"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Scheduled At</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Interviewer</label>
            <Input
              placeholder="Interviewer name (optional)"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notes</label>
            <Textarea
              placeholder="Preparation notes, what to focus on…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !jobId} size="sm">
              {submitting ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Single interview card ─────────────────────────────────────────

function InterviewCard({
  note,
  job,
  onRefresh,
}: {
  note: InterviewNote;
  job?: Job;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loadingPrep, setLoadingPrep] = useState(false);

  const scheduledDate = note.scheduled_at
    ? new Date(note.scheduled_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  async function handleGeneratePrep() {
    if (!job) return;
    setLoadingPrep(true);
    try {
      const result = await apiPost<{ prep: InterviewPrepMaterial }>("/interviews/prep", {
        job_title: job.title,
        company: job.company,
        job_description: job.description || "",
      });
      await apiPatch(`/interviews/${note.id}`, { prep_material: result.prep });
      onRefresh();
    } finally {
      setLoadingPrep(false);
    }
  }

  async function handleStatusToggle() {
    const next = note.status === "upcoming" ? "completed" : "upcoming";
    await apiPatch(`/interviews/${note.id}`, { status: next });
    onRefresh();
  }

  async function handleDelete() {
    await apiDelete(`/interviews/${note.id}`);
    onRefresh();
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-zinc-100 text-sm">{note.round_name}</h3>
              <StatusBadge status={note.status} />
            </div>
            {job && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {job.title} at {job.company}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
              {scheduledDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {scheduledDate}
                </span>
              )}
              {note.interviewer_name && (
                <span>with {note.interviewer_name}</span>
              )}
            </div>
            {note.notes && (
              <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{note.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!note.prep_material && job && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGeneratePrep}
                disabled={loadingPrep}
                className="h-7 px-2 text-xs gap-1"
                title="Generate AI prep"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {loadingPrep ? "…" : "Prep"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStatusToggle}
              className="h-7 px-2"
              title={note.status === "upcoming" ? "Mark completed" : "Mark upcoming"}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-red-400 hover:text-red-300"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {note.prep_material && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              {expanded ? "Hide" : "Show"} AI Prep Material
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {expanded && <PrepMaterialCard prep={note.prep_material} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────

function InterviewsPageContent() {
  const searchParams = useSearchParams();
  const prefillJobId = searchParams.get("jobId");

  const { data: interviews, mutate: refreshInterviews } = useSWR<InterviewNote[]>(
    "/interviews",
    () => apiGet<InterviewNote[]>("/interviews")
  );
  const { data: jobs } = useSWR<Job[]>("/jobs", () => apiGet<Job[]>("/jobs"));

  const jobMap = new Map((jobs || []).map((j) => [j.id, j]));

  const upcoming = (interviews || [])
    .filter((n) => n.status === "upcoming")
    .sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at)
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      if (a.scheduled_at) return -1;
      if (b.scheduled_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const past = (interviews || [])
    .filter((n) => n.status !== "upcoming")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Interview Prep</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track interview rounds, generate AI prep material, and keep notes
          </p>
        </div>
        <NewInterviewForm
          jobs={jobs || []}
          onCreated={() => {
            refreshInterviews();
            mutate("/interviews");
          }}
          prefillJobId={prefillJobId}
        />
      </div>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            No upcoming interviews. Add one to get started with AI-powered prep.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((note) => (
              <InterviewCard
                key={note.id}
                note={note}
                job={jobMap.get(note.job_id)}
                onRefresh={refreshInterviews}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Past ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((note) => (
              <InterviewCard
                key={note.id}
                note={note}
                job={jobMap.get(note.job_id)}
                onRefresh={refreshInterviews}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-zinc-400 p-6 text-sm" role="status">
          Loading interviews…
        </div>
      }
    >
      <InterviewsPageContent />
    </Suspense>
  );
}

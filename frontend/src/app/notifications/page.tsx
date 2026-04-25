"use client";

import { useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Reminder, Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  Plus,
  Clock,
  AlertTriangle,
  Mail,
  Calendar,
  Star,
} from "lucide-react";
import useSWR from "swr";

// ── Reminder type config ─────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  interview_upcoming: { label: "Interview", color: "text-amber-400", bg: "bg-amber-400/10", icon: Calendar },
  follow_up_application: { label: "Follow Up", color: "text-blue-400", bg: "bg-blue-400/10", icon: Mail },
  follow_up_interview: { label: "Post-Interview", color: "text-purple-400", bg: "bg-purple-400/10", icon: Mail },
  offer_deadline: { label: "Offer Deadline", color: "text-red-400", bg: "bg-red-400/10", icon: AlertTriangle },
  custom: { label: "Custom", color: "text-zinc-400", bg: "bg-zinc-400/10", icon: Bell },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.custom;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

// ── New reminder form ────────────────────────────────────────────

function NewReminderForm({ jobs, onCreated }: { jobs: Job[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/notifications/reminders", {
        job_id: jobId || null,
        reminder_type: "custom",
        title,
        message,
        due_at: dueAt || null,
      });
      setJobId("");
      setTitle("");
      setMessage("");
      setDueAt("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-expanded="false"
        aria-controls="new-reminder-form"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add Reminder
      </Button>
    );
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Reminder</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="new-reminder-form"
          onSubmit={handleSubmit}
          className="space-y-3"
          aria-busy={submitting}
        >
          <div>
            <label htmlFor="reminder-title" className="text-xs text-zinc-400 block mb-1">Title *</label>
            <Input
              id="reminder-title"
              name="title"
              placeholder="e.g. Follow up with recruiter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800 border-zinc-700"
              autoComplete="off"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reminder-job" className="text-xs text-zinc-400 block mb-1">Related Job</label>
              <select
                id="reminder-job"
                name="job_id"
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
              >
                <option value="">None</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.company}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reminder-due" className="text-xs text-zinc-400 block mb-1">Due Date</label>
              <Input
                id="reminder-due"
                name="due_at"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reminder-message" className="text-xs text-zinc-400 block mb-1">Message</label>
            <Textarea
              id="reminder-message"
              name="message"
              placeholder="Details about this reminder…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="bg-zinc-800 border-zinc-700"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !title.trim()} size="sm">
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

// ── Single reminder card ─────────────────────────────────────────

function ReminderCard({
  reminder,
  job,
  onRefresh,
}: {
  reminder: Reminder;
  job?: Job;
  onRefresh: () => void;
}) {
  const dueDate = reminder.due_at
    ? new Date(reminder.due_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const isOverdue = reminder.due_at && new Date(reminder.due_at) < new Date();

  async function handleDismiss() {
    await apiPatch(`/notifications/reminders/${reminder.id}`, { is_dismissed: true });
    onRefresh();
  }

  async function handleMarkRead() {
    await apiPatch(`/notifications/reminders/${reminder.id}`, { is_read: !reminder.is_read });
    onRefresh();
  }

  async function handleDelete() {
    await apiDelete(`/notifications/reminders/${reminder.id}`);
    onRefresh();
  }

  return (
    <Card className={`border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600 ${reminder.is_read ? "opacity-60" : ""}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-zinc-100 text-sm">{reminder.title}</h3>
              <TypeBadge type={reminder.reminder_type} />
              {!reminder.is_read && (
                <span
                  className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"
                  aria-label="Unread"
                  role="img"
                />
              )}
            </div>
            {job && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {job.title} at {job.company}
              </p>
            )}
            {reminder.message && (
              <p className="text-sm text-zinc-300 mt-2">{reminder.message}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              {dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : ""}`}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {isOverdue ? "Overdue: " : "Due: "}
                  {dueDate}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkRead}
              aria-label={reminder.is_read ? `Mark "${reminder.title}" as unread` : `Mark "${reminder.title}" as read`}
              className="h-7 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {reminder.is_read
                ? <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              aria-label={`Dismiss reminder "${reminder.title}"`}
              className="h-7 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label={`Delete reminder "${reminder.title}"`}
              className="h-7 px-2 text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: reminders, mutate: refreshReminders } = useSWR<Reminder[]>(
    "/notifications/reminders",
    () => apiGet<Reminder[]>("/notifications/reminders")
  );
  const { data: jobs } = useSWR<Job[]>("/jobs", () => apiGet<Job[]>("/jobs"));

  const jobMap = new Map((jobs || []).map((j) => [j.id, j]));

  const unread = (reminders || []).filter((r) => !r.is_read);
  const read = (reminders || []).filter((r) => r.is_read);

  // Sort: overdue first, then by due date
  const sortReminders = (arr: Reminder[]) =>
    [...arr].sort((a, b) => {
      const now = Date.now();
      const aOverdue = a.due_at && new Date(a.due_at).getTime() < now ? 1 : 0;
      const bOverdue = b.due_at && new Date(b.due_at).getTime() < now ? 1 : 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Notifications</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Smart reminders for interviews, follow-ups, and offer deadlines
          </p>
        </div>
        <NewReminderForm
          jobs={jobs || []}
          onCreated={refreshReminders}
        />
      </div>

      {/* Unread */}
      <section aria-labelledby="reminders-active-heading">
        <h2 id="reminders-active-heading" className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Bell className="h-4 w-4" aria-hidden="true" /> Active ({unread.length})
        </h2>
        {unread.length === 0 ? (
          <p className="text-sm text-zinc-500 italic">
            No active reminders. They&apos;ll appear automatically based on your job activity.
          </p>
        ) : (
          <div className="space-y-3">
            {sortReminders(unread).map((rem) => (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                job={jobMap.get(rem.job_id || "")}
                onRefresh={refreshReminders}
              />
            ))}
          </div>
        )}
      </section>

      {/* Read */}
      {read.length > 0 && (
        <section aria-labelledby="reminders-read-heading">
          <h2 id="reminders-read-heading" className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Check className="h-4 w-4" aria-hidden="true" /> Read ({read.length})
          </h2>
          <div className="space-y-3">
            {sortReminders(read).map((rem) => (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                job={jobMap.get(rem.job_id || "")}
                onRefresh={refreshReminders}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

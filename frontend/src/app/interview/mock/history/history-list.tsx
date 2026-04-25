"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Clock, ArrowRight, Play } from "lucide-react";
import { listSessions, type SessionListItem } from "@/lib/mock-interview/api";

// ── Constants ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  "swe-intern": "Software Engineering Intern",
  "swe-new-grad": "Software Engineer (New Grad)",
  "pm-intern": "Product Management Intern",
  "data-intern": "Data Science / Analytics Intern",
  "design-intern": "UX / Product Design Intern",
  general: "General Role",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-zinc-800 border border-zinc-700 p-4">
        <Bot className="h-7 w-7 text-zinc-400" aria-hidden />
      </div>
      <p className="text-zinc-400 text-sm max-w-xs">
        No mock interview sessions yet. Start one to build your interview
        confidence.
      </p>
      <Link
        href="/interview/mock"
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        Start a new mock interview
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────────

function SessionRow({ item }: { item: SessionListItem }) {
  const roleLabel = ROLE_LABELS[item.role] ?? item.role;

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 hover:border-zinc-700 hover:bg-zinc-800/70 transition-colors"
      data-testid="history-session-row"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 rounded-full bg-blue-500/10 border border-blue-500/20 p-1.5">
          {item.complete ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          ) : (
            <Clock className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">
            {roleLabel}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{formatDate(item.created_at)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {item.complete && item.overall_score != null ? (
          <span
            className={`text-sm font-semibold tabular-nums ${scoreColor(item.overall_score)}`}
            aria-label={`Overall score ${item.overall_score}`}
          >
            {item.overall_score}
            <span className="text-xs font-normal text-zinc-500">/100</span>
          </span>
        ) : item.complete ? (
          <span className="text-xs text-zinc-500">Completed</span>
        ) : null}

        {!item.complete ? (
          <Link
            href={`/interview/mock?session=${item.session_id}`}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-xs font-medium text-white transition-colors"
            data-testid="resume-session-btn"
            aria-label={`Resume ${roleLabel} interview`}
          >
            <Play className="h-3 w-3" aria-hidden />
            Resume
          </Link>
        ) : (
          <Link
            href={`/interview/mock?session=${item.session_id}`}
            className="group"
            aria-label={`View ${roleLabel} interview`}
          >
            <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function HistoryList() {
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (sessions === null && error === null) {
    // Loading skeleton
    return (
      <div className="space-y-3 animate-pulse" aria-label="Loading sessions">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-zinc-800 border border-zinc-700" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
        {error}
      </p>
    );
  }

  if (!sessions || sessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2" data-testid="history-list">
      {sessions.map((item) => (
        <SessionRow key={item.session_id} item={item} />
      ))}
    </div>
  );
}

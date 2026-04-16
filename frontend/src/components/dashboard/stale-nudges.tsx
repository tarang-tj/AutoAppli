"use client";
import { Card, CardContent } from "@/components/ui/card";
import type { Job } from "@/types";
import { AlertTriangle, Clock, Ghost, Send } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Nudge {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  message: string;
  action?: { label: string; href: string };
  jobs: Job[];
}

function computeNudges(jobs: Job[]): Nudge[] {
  const now = Date.now();
  const nudges: Nudge[] = [];

  // 1. Bookmarked for > 7 days without applying
  const staleBookmarks = jobs.filter(
    (j) =>
      j.status === "bookmarked" &&
      now - new Date(j.created_at).getTime() > 7 * DAY_MS
  );
  if (staleBookmarks.length > 0) {
    nudges.push({
      id: "stale-bookmarks",
      icon: Clock,
      iconColor: "text-amber-400",
      message: `${staleBookmarks.length} bookmarked ${staleBookmarks.length === 1 ? "job has" : "jobs have"} been sitting for over a week. Time to apply or remove?`,
      jobs: staleBookmarks,
    });
  }

  // 2. Applied but no response in > 14 days
  const noResponse = jobs.filter(
    (j) =>
      j.status === "applied" &&
      now - new Date(j.updated_at).getTime() > 14 * DAY_MS
  );
  if (noResponse.length > 0) {
    nudges.push({
      id: "no-response",
      icon: Ghost,
      iconColor: "text-zinc-400",
      message: `${noResponse.length} ${noResponse.length === 1 ? "application" : "applications"} applied 2+ weeks ago with no update. Consider following up or marking as ghosted.`,
      action: { label: "Draft follow-up", href: "/outreach" },
      jobs: noResponse,
    });
  }

  // 3. Upcoming deadlines (within 3 days)
  const upcomingDeadlines = jobs.filter((j) => {
    if (!j.deadline || j.status === "rejected" || j.status === "ghosted") return false;
    const dl = new Date(j.deadline).getTime();
    return dl > now && dl - now < 3 * DAY_MS;
  });
  if (upcomingDeadlines.length > 0) {
    nudges.push({
      id: "upcoming-deadlines",
      icon: AlertTriangle,
      iconColor: "text-red-400",
      message: `${upcomingDeadlines.length} ${upcomingDeadlines.length === 1 ? "deadline" : "deadlines"} coming up in the next 3 days!`,
      jobs: upcomingDeadlines,
    });
  }

  // 4. Interviewing for > 21 days without progress
  const longInterviews = jobs.filter(
    (j) =>
      j.status === "interviewing" &&
      now - new Date(j.updated_at).getTime() > 21 * DAY_MS
  );
  if (longInterviews.length > 0) {
    nudges.push({
      id: "long-interviews",
      icon: Send,
      iconColor: "text-yellow-400",
      message: `${longInterviews.length} ${longInterviews.length === 1 ? "interview" : "interviews"} in progress for 3+ weeks. Check in with the recruiter?`,
      action: { label: "Send outreach", href: "/outreach" },
      jobs: longInterviews,
    });
  }

  return nudges;
}

export function StaleNudges({ jobs }: { jobs: Job[] }) {
  const nudges = useMemo(() => computeNudges(jobs), [jobs]);

  if (nudges.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {nudges.map((nudge) => (
        <Card
          key={nudge.id}
          className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <nudge.icon
              className={`h-5 w-5 shrink-0 ${nudge.iconColor}`}
              aria-hidden
            />
            <p className="text-sm text-zinc-300 flex-1">{nudge.message}</p>
            {nudge.action && (
              <Link
                href={nudge.action.href}
                className="shrink-0 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                {nudge.action.label} &rarr;
              </Link>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

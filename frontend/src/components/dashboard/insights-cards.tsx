"use client";

import type { Job } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useMemo } from "react";

interface InsightData {
  responseRate: number;
  avgDaysInPipeline: number | null;
  topSource: { name: string; count: number } | null;
  thisWeekCount: number;
  lastWeekCount: number;
  interviewRate: number;
  activeCount: number;
}

function computeInsights(jobs: Job[]): InsightData {
  const total = jobs.length;
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const j of jobs) {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  }

  const bookmarked = statusCounts["bookmarked"] || 0;
  const applied = statusCounts["applied"] || 0;
  const interviewing = statusCounts["interviewing"] || 0;
  const offer = statusCounts["offer"] || 0;
  const rejected = statusCounts["rejected"] || 0;

  const totalNonBookmarked = total - bookmarked;
  const responded = interviewing + offer + rejected;

  // Response rate
  const responseRate = totalNonBookmarked > 0
    ? Math.round((responded / totalNonBookmarked) * 100)
    : 0;

  // Interview rate
  const interviewRate = totalNonBookmarked > 0
    ? Math.round(((interviewing + offer) / totalNonBookmarked) * 100)
    : 0;

  // Avg days in pipeline
  const durations: number[] = [];
  for (const job of jobs) {
    if (job.created_at && job.updated_at) {
      const created = new Date(job.created_at).getTime();
      const updated = new Date(job.updated_at).getTime();
      if (updated > created) {
        durations.push((updated - created) / (1000 * 60 * 60 * 24));
      }
    }
  }
  const avgDaysInPipeline = durations.length > 0
    ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
    : null;

  // Top source
  const sourceMap: Record<string, number> = {};
  for (const j of jobs) {
    const src = j.source || "unknown";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const topSourceEntry = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0];
  const topSource = topSourceEntry ? { name: topSourceEntry[0], count: topSourceEntry[1] } : null;

  // This week vs last week
  const thisWeekStart = now - WEEK;
  const lastWeekStart = now - 2 * WEEK;
  const thisWeekCount = jobs.filter((j) => new Date(j.created_at).getTime() >= thisWeekStart).length;
  const lastWeekCount = jobs.filter((j) => {
    const t = new Date(j.created_at).getTime();
    return t >= lastWeekStart && t < thisWeekStart;
  }).length;

  return {
    responseRate,
    avgDaysInPipeline,
    topSource,
    thisWeekCount,
    lastWeekCount,
    interviewRate,
    activeCount: applied + interviewing,
  };
}

function InsightCard({
  icon: Icon,
  iconColor,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <Card className="bg-zinc-900/80 border-zinc-700/60 hover:border-zinc-600 [transition:border-color_150ms]">
      <CardContent className="flex items-center gap-3 py-3.5 px-4">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${iconColor}18` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color: iconColor }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-white tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-zinc-400 leading-tight">{title}</p>
          {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightsCards({ jobs }: { jobs: Job[] }) {
  const insights = useMemo(() => computeInsights(jobs), [jobs]);

  if (jobs.length === 0) return null;

  const weekTrend = insights.thisWeekCount - insights.lastWeekCount;
  const TrendIcon = weekTrend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = weekTrend > 0 ? "#10b981" : weekTrend < 0 ? "#ef4444" : "#6b7280";
  const trendText = weekTrend > 0
    ? `+${weekTrend} vs last week`
    : weekTrend < 0
    ? `${weekTrend} vs last week`
    : "Same as last week";

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5"
      role="group"
      aria-label="Application insights"
    >
      <InsightCard
        icon={Zap}
        iconColor="#f59e0b"
        title="This Week"
        value={insights.thisWeekCount}
        subtitle={trendText}
      />
      <InsightCard
        icon={Target}
        iconColor="#8b5cf6"
        title="Response Rate"
        value={`${insights.responseRate}%`}
        subtitle={`${insights.interviewRate}% interview rate`}
      />
      <InsightCard
        icon={Clock}
        iconColor="#3b82f6"
        title="Avg. Pipeline Days"
        value={insights.avgDaysInPipeline !== null ? insights.avgDaysInPipeline.toFixed(1) : "\u2014"}
        subtitle={`${insights.activeCount} active applications`}
      />
      <InsightCard
        icon={BarChart3}
        iconColor="#10b981"
        title="Top Source"
        value={insights.topSource ? insights.topSource.name : "\u2014"}
        subtitle={insights.topSource ? `${insights.topSource.count} applications` : undefined}
      />
    </div>
  );
}

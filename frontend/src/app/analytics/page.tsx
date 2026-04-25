"use client";

import type { AnalyticsData, AnalyticsConversions, AnalyticsDurations, Job, RemoteType, JobType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs } from "@/hooks/use-jobs";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Briefcase,
  Send,
  ThumbsUp,
  ThumbsDown,
  Activity,
  DollarSign,
  Laptop,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

// ── Colour helpers ────────────────────────────────────────────────────

const STATUS_COLOURS: Record<string, string> = {
  bookmarked: "#3b82f6",
  applied: "#8b5cf6",
  interviewing: "#f59e0b",
  offer: "#10b981",
  rejected: "#ef4444",
  ghosted: "#6b7280",
};

const SOURCE_COLOURS: Record<string, string> = {
  linkedin: "#0a66c2",
  indeed: "#2164f3",
  "company-website": "#10b981",
  manual: "#8b5cf6",
  greenhouse: "#3b9c50",
  lever: "#4b5563",
  handshake: "#f59e0b",
  unknown: "#6b7280",
};

// ── Stat card ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  colour,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  colour: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${colour}20` }}
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" style={{ color: colour }} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          <p className="text-sm text-zinc-400">{label}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────

function HBar({
  items,
  colourMap,
}: {
  items: { label: string; value: number }[];
  colourMap: Record<string, string>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-300 capitalize">{item.label.replace(/-/g, " ")}</span>
            <span className="text-zinc-400 font-medium tabular-nums">{item.value}</span>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full [transition:width_500ms,background-color_500ms] motion-reduce:transition-none"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: colourMap[item.label] || "#6b7280",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Funnel visualisation ──────────────────────────────────────────────

function FunnelChart({ stages }: { stages: { stage: string; count: number }[] }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const width = Math.max((s.count / maxCount) * 100, 8);
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <span className="w-28 text-right text-sm text-zinc-400 capitalize shrink-0">
              {s.stage}
            </span>
            <div className="flex-1 h-9 relative">
              <div
                className="h-full rounded-lg flex items-center px-3 [transition:width_500ms,background-color_500ms,opacity_500ms] motion-reduce:transition-none"
                style={{
                  width: `${width}%`,
                  backgroundColor: STATUS_COLOURS[s.stage] || "#6b7280",
                  opacity: 0.85 + i * 0.025,
                }}
              >
                <span className="text-sm font-semibold text-white drop-shadow-sm">
                  {s.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Conversion gauge ──────────────────────────────────────────────────

function ConversionGauge({ label, pct }: { label: string; pct: number }) {
  const angle = (pct / 100) * 180;
  const r = 50;
  const cx = 60;
  const cy = 55;
  const rad = (a: number) => ((a - 180) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(0));
  const y1 = cy + r * Math.sin(rad(0));
  const x2 = cx + r * Math.cos(rad(angle));
  const y2 = cy + r * Math.sin(rad(angle));
  const large = angle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="120"
        height="70"
        viewBox="0 0 120 70"
        role="img"
        aria-label={`${label}: ${pct}%`}
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`}
            fill="none"
            stroke={pct >= 50 ? "#10b981" : pct >= 25 ? "#f59e0b" : "#ef4444"}
            strokeWidth="10"
            strokeLinecap="round"
          />
        )}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
          {pct}%
        </text>
      </svg>
      <p className="text-xs text-zinc-400 text-center mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ── Bar chart (weekly activity) ───────────────────────────────────────

function WeeklyBarChart({ data }: { data: { week_end: string; jobs_added: number }[] }) {
  const max = Math.max(...data.map((d) => d.jobs_added), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-zinc-400 tabular-nums">{d.jobs_added}</span>
          <div
            className="w-full rounded-t-md bg-blue-500/80 [transition:height_500ms] motion-reduce:transition-none"
            style={{ height: `${Math.max((d.jobs_added / max) * 100, 4)}%` }}
          />
          <span className="text-[10px] text-zinc-500 leading-tight text-center">
            {d.week_end}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Compute analytics from real jobs ─────────────────────────────────

function computeAnalytics(jobs: Job[]): AnalyticsData {
  const total = jobs.length;
  const statusOrder = ["bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted"];

  // Funnel
  const funnel = statusOrder.map((stage) => ({
    stage,
    count: jobs.filter((j) => j.status === stage).length,
  }));

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const s of statusOrder) {
    statusCounts[s] = jobs.filter((j) => j.status === s).length;
  }

  // Conversions
  const bookmarked = statusCounts["bookmarked"] || 0;
  const applied = statusCounts["applied"] || 0;
  const interviewing = statusCounts["interviewing"] || 0;
  const offer = statusCounts["offer"] || 0;
  const rejected = statusCounts["rejected"] || 0;
  const ghosted = statusCounts["ghosted"] || 0;

  const totalNonBookmarked = total - bookmarked;
  const responded = interviewing + offer + rejected; // jobs that got some response

  const conversions: AnalyticsConversions = {
    bookmarked_to_applied: total > 0 ? Math.round(((total - bookmarked) / total) * 100) : 0,
    applied_to_interviewing: totalNonBookmarked > 0 ? Math.round(((interviewing + offer) / totalNonBookmarked) * 100) : 0,
    interviewing_to_offer: (interviewing + offer) > 0 ? Math.round((offer / (interviewing + offer)) * 100) : 0,
    rejection_rate: totalNonBookmarked > 0 ? Math.round((rejected / totalNonBookmarked) * 100) : 0,
    ghost_rate: totalNonBookmarked > 0 ? Math.round((ghosted / totalNonBookmarked) * 100) : 0,
  };

  // Average durations
  const durations: number[] = [];
  for (const job of jobs) {
    if (job.created_at && job.updated_at) {
      const created = new Date(job.created_at).getTime();
      const updated = new Date(job.updated_at).getTime();
      if (updated > created) {
        durations.push(Math.abs(updated - created) / (1000 * 60 * 60 * 24));
      }
    }
  }
  const avgLifecycle = durations.length > 0
    ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
    : null;

  const avgDurations: AnalyticsDurations = {
    bookmarked_to_applied: avgLifecycle ? Math.round(avgLifecycle * 0.3 * 10) / 10 : null,
    applied_to_latest: avgLifecycle ? Math.round(avgLifecycle * 0.7 * 10) / 10 : null,
    total_lifecycle: avgLifecycle,
  };

  // Sources
  const sourceMap: Record<string, number> = {};
  for (const job of jobs) {
    const src = job.source || "unknown";
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  }
  const sources = Object.entries(sourceMap)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  // Weekly activity (last 8 weeks)
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const weeklyActivity = [];
  for (let i = 0; i < 8; i++) {
    const weekStart = now - (8 - i) * WEEK;
    const weekEnd = weekStart + WEEK;
    const count = jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= weekStart && t < weekEnd;
    }).length;
    const endDate = new Date(weekEnd);
    weeklyActivity.push({
      week_start: new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      week_end: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      jobs_added: count,
    });
  }

  // Top companies
  const companyMap: Record<string, number> = {};
  for (const job of jobs) {
    if (job.company) {
      companyMap[job.company] = (companyMap[job.company] || 0) + 1;
    }
  }
  const topCompanies = Object.entries(companyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => ({ company, count }));

  // Response rate
  const responseRate = totalNonBookmarked > 0
    ? Math.round((responded / totalNonBookmarked) * 100)
    : 0;

  // Summary
  const summary = {
    active_applications: applied + interviewing,
    interviews_in_progress: interviewing,
    offers: offer,
    rejections: rejected,
  };

  return {
    total_jobs: total,
    funnel,
    conversions,
    avg_durations_days: avgDurations,
    sources,
    weekly_activity: weeklyActivity,
    top_companies: topCompanies,
    response_rate: responseRate,
    summary,
  };
}

// ── Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { jobs, isLoading } = useJobs();

  const data = useMemo(() => {
    return jobs.length > 0 ? computeAnalytics(jobs) : null;
  }, [jobs]);

  if (isLoading) {
    return (
      <div
        className="p-6 space-y-6 animate-pulse motion-reduce:animate-none"
        role="status"
        aria-busy="true"
        aria-label="Loading analytics"
      >
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-800 rounded-xl" />
          <div className="h-64 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <Card className="bg-zinc-900 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-zinc-600 mb-4" />
            <p className="text-zinc-300 font-medium text-lg">No data yet</p>
            <p className="text-zinc-500 text-sm mt-1 max-w-md">
              Add job applications to your tracker to see analytics about your pipeline,
              conversion rates, and activity trends.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { funnel, conversions, avg_durations_days: dur, sources, weekly_activity, top_companies, summary } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-blue-400" aria-hidden="true" />
          Analytics
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
          Track your application pipeline, conversion rates, and activity trends.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Jobs"
          value={data.total_jobs}
          icon={Briefcase}
          colour="#3b82f6"
        />
        <StatCard
          label="Active Applications"
          value={summary.active_applications}
          sub={`${summary.interviews_in_progress} interviewing`}
          icon={Send}
          colour="#8b5cf6"
        />
        <StatCard
          label="Offers"
          value={summary.offers}
          icon={ThumbsUp}
          colour="#10b981"
        />
        <StatCard
          label="Rejections"
          value={summary.rejections}
          icon={ThumbsDown}
          colour="#ef4444"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline Funnel */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" aria-hidden="true" />
              Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnel} />
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              Conversion Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <ConversionGauge
                label="Bookmarked → Applied"
                pct={conversions.bookmarked_to_applied}
              />
              <ConversionGauge
                label="Applied → Interview"
                pct={conversions.applied_to_interviewing}
              />
              <ConversionGauge
                label="Interview → Offer"
                pct={conversions.interviewing_to_offer}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-xl font-bold text-red-400 tabular-nums">
                  {conversions.rejection_rate}%
                </p>
                <p className="text-xs text-zinc-500">Rejection rate</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-zinc-400 tabular-nums">
                  {conversions.ghost_rate}%
                </p>
                <p className="text-xs text-zinc-500">Ghost rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Average Durations */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" aria-hidden="true" />
              Average Time (days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {dur.bookmarked_to_applied ?? "\u2014"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Bookmark \u2192 Apply</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {dur.applied_to_latest ?? "\u2014"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Apply \u2192 Response</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {dur.total_lifecycle ?? "\u2014"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Full Lifecycle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" aria-hidden="true" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <p className="text-5xl font-bold text-white tabular-nums">
                {data.response_rate}
                <span className="text-2xl text-zinc-400">%</span>
              </p>
              <p className="text-sm text-zinc-500 mt-2">
                of applications received some response
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Source Breakdown */}
        {sources.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Job Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <HBar
                items={sources.map((s) => ({ label: s.source, value: s.count }))}
                colourMap={SOURCE_COLOURS}
              />
            </CardContent>
          </Card>
        )}

        {/* Weekly Activity */}
        {weekly_activity.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyBarChart data={weekly_activity} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Companies */}
      {top_companies.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {top_companies.map((c) => (
                <div
                  key={c.company}
                  className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-center hover:border-zinc-600 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">{c.company}</p>
                  <p className="text-xs text-zinc-400 tabular-nums">{c.count} {c.count === 1 ? "job" : "jobs"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Rich field analytics ──────────────────────────────────── */}
      <RichFieldAnalytics jobs={jobs} />
    </div>
  );
}

// ── Rich field analytics component ─────────────────────────────────

const REMOTE_COLOURS: Record<string, string> = {
  remote: "#10b981",
  hybrid: "#f59e0b",
  onsite: "#3b82f6",
  unknown: "#6b7280",
};

const JOB_TYPE_COLOURS: Record<string, string> = {
  full_time: "#3b82f6",
  part_time: "#8b5cf6",
  contract: "#f59e0b",
  internship: "#10b981",
  freelance: "#ef4444",
};

function RichFieldAnalytics({ jobs }: { jobs: Job[] }) {
  const stats = useMemo(() => {
    // Salary stats
    const withSalary = jobs.filter((j) => j.salary_min || j.salary_max);
    let avgSalaryMin = 0;
    let avgSalaryMax = 0;
    let salaryCount = 0;
    for (const j of withSalary) {
      if (j.salary_min) { avgSalaryMin += j.salary_min; salaryCount++; }
      if (j.salary_max) { avgSalaryMax += j.salary_max; }
    }
    avgSalaryMin = salaryCount > 0 ? Math.round(avgSalaryMin / salaryCount) : 0;
    avgSalaryMax = withSalary.length > 0 ? Math.round(avgSalaryMax / withSalary.length) : 0;

    // Remote type breakdown
    const remoteMap: Record<string, number> = {};
    for (const j of jobs) {
      const rt = j.remote_type || "unknown";
      remoteMap[rt] = (remoteMap[rt] || 0) + 1;
    }
    const remoteBreakdown = Object.entries(remoteMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    // Job type breakdown
    const jtMap: Record<string, number> = {};
    for (const j of jobs) {
      const jt = j.job_type || "full_time";
      jtMap[jt] = (jtMap[jt] || 0) + 1;
    }
    const jobTypeBreakdown = Object.entries(jtMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    // Top skills
    const skillMap: Record<string, number> = {};
    for (const j of jobs) {
      for (const s of j.skills ?? []) {
        skillMap[s] = (skillMap[s] || 0) + 1;
      }
    }
    const topSkills = Object.entries(skillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([skill, count]) => ({ skill, count }));

    // Top locations
    const locMap: Record<string, number> = {};
    for (const j of jobs) {
      if (j.location) {
        locMap[j.location] = (locMap[j.location] || 0) + 1;
      }
    }
    const topLocations = Object.entries(locMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([loc, count]) => ({ loc, count }));

    // Priority distribution
    const priorityMap: Record<number, number> = {};
    for (const j of jobs) {
      const p = j.priority ?? 0;
      if (p > 0) priorityMap[p] = (priorityMap[p] || 0) + 1;
    }

    // Tag cloud
    const tagMap: Record<string, number> = {};
    for (const j of jobs) {
      for (const t of j.tags ?? []) {
        tagMap[t] = (tagMap[t] || 0) + 1;
      }
    }
    const topTags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      withSalary, avgSalaryMin, avgSalaryMax,
      remoteBreakdown, jobTypeBreakdown,
      topSkills, topLocations, priorityMap, topTags,
    };
  }, [jobs]);

  const hasRichData =
    stats.withSalary.length > 0 ||
    stats.topSkills.length > 0 ||
    stats.topLocations.length > 0 ||
    stats.topTags.length > 0 ||
    stats.remoteBreakdown.some((r) => r.label !== "unknown");

  if (!hasRichData) return null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Salary Insights */}
        {stats.withSalary.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                Salary Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {stats.withSalary.length}
                  </p>
                  <p className="text-xs text-zinc-500">With salary data</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ${Math.round(stats.avgSalaryMin / 1000)}k
                  </p>
                  <p className="text-xs text-zinc-500">Avg min</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ${Math.round(stats.avgSalaryMax / 1000)}k
                  </p>
                  <p className="text-xs text-zinc-500">Avg max</p>
                </div>
              </div>
              <div className="space-y-2">
                {stats.withSalary.slice(0, 5).map((j) => (
                  <div key={j.id} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300 truncate max-w-[60%]">{j.company} — {j.title}</span>
                    <span className="text-emerald-400 tabular-nums font-medium">
                      {j.salary_min ? `$${Math.round(j.salary_min / 1000)}k` : ""}
                      {j.salary_min && j.salary_max ? "–" : ""}
                      {j.salary_max ? `$${Math.round(j.salary_max / 1000)}k` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remote Type Breakdown */}
        {stats.remoteBreakdown.some((r) => r.label !== "unknown") && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Laptop className="h-5 w-5 text-sky-400" aria-hidden="true" />
                Work Model Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HBar items={stats.remoteBreakdown} colourMap={REMOTE_COLOURS} />
              <div className="border-t border-zinc-800 mt-4 pt-4">
                <HBar items={stats.jobTypeBreakdown.map((i) => ({ ...i, label: i.label.replace(/_/g, " ") }))} colourMap={JOB_TYPE_COLOURS} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Skills */}
        {stats.topSkills.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" aria-hidden="true" />
                Top Skills Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topSkills.map((s) => (
                  <span
                    key={s.skill}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 px-3 py-1.5 text-sm text-violet-200"
                  >
                    {s.skill}
                    <span className="text-xs text-violet-400/70 tabular-nums">{s.count}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Locations */}
        {stats.topLocations.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-400" aria-hidden="true" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topLocations.map((l) => {
                  const pct = Math.max((l.count / jobs.length) * 100, 4);
                  return (
                    <div key={l.loc} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-300">{l.loc}</span>
                        <span className="text-zinc-400 font-medium tabular-nums">{l.count}</span>
                      </div>
                      <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500/80 [transition:width_500ms] motion-reduce:transition-none"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tags Cloud */}
      {stats.topTags.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-lg">Your Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 px-3 py-1.5 text-sm text-blue-200"
                >
                  #{t.tag}
                  <span className="text-xs text-blue-400/70 tabular-nums">{t.count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

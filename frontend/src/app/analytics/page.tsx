"use client";

import { apiGet } from "@/lib/api";
import type { AnalyticsData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Briefcase,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import useSWR from "swr";

// ── Colour helpers ────────────────────────────────────────────────────

const STATUS_COLOURS: Record<string, string> = {
  bookmarked: "#3b82f6",  // blue
  applied: "#8b5cf6",     // purple
  interviewing: "#f59e0b", // amber
  offer: "#10b981",        // emerald
  rejected: "#ef4444",     // red
  ghosted: "#6b7280",      // gray
};

const SOURCE_COLOURS: Record<string, string> = {
  linkedin: "#0a66c2",
  indeed: "#2164f3",
  "company-website": "#10b981",
  manual: "#8b5cf6",
  greenhouse: "#3b9c50",
  lever: "#4b5563",
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
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="flex items-center gap-4 py-5">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${colour}20` }}
        >
          <Icon className="h-6 w-6" style={{ color: colour }} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white">{value}</p>
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
            <span className="text-zinc-400 font-medium">{item.value}</span>
          </div>
          <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
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
                className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
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
      <svg width="120" height="70" viewBox="0 0 120 70">
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
          <span className="text-xs text-zinc-400">{d.jobs_added}</span>
          <div
            className="w-full rounded-t-md bg-blue-500/80 transition-all duration-500"
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

// ── Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading, error } = useSWR<AnalyticsData>(
    "/analytics",
    () => apiGet<AnalyticsData>("/analytics"),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="text-zinc-400 p-6 text-sm" role="status">
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-red-400 p-6 text-sm" role="alert">
        Failed to load analytics. {error?.message}
      </div>
    );
  }

  const { funnel, conversions, avg_durations_days: dur, sources, weekly_activity, top_companies, summary } = data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-300 text-sm mt-1 max-w-2xl leading-relaxed">
          Track your application pipeline, conversion rates, and activity trends.
        </p>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────── */}
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
        {/* ── Pipeline Funnel ──────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" aria-hidden />
              Pipeline Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnel} />
          </CardContent>
        </Card>

        {/* ── Conversion Rates ─────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" aria-hidden />
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
                <p className="text-xl font-bold text-red-400">
                  {conversions.rejection_rate}%
                </p>
                <p className="text-xs text-zinc-500">Rejection rate</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-zinc-400">
                  {conversions.ghost_rate}%
                </p>
                <p className="text-xs text-zinc-500">Ghost rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ── Average Durations ─────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" aria-hidden />
              Average Time (days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">
                  {dur.bookmarked_to_applied ?? "—"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Bookmark → Apply</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {dur.applied_to_latest ?? "—"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Apply → Response</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {dur.total_lifecycle ?? "—"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Full Lifecycle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Response Rate ────────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" aria-hidden />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <p className="text-5xl font-bold text-white">
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
        {/* ── Source Breakdown ──────────────────────────────────────── */}
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

        {/* ── Weekly Activity ──────────────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyBarChart data={weekly_activity} />
          </CardContent>
        </Card>
      </div>

      {/* ── Top Companies ────────────────────────────────────────── */}
      {top_companies.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {top_companies.map((c) => (
                <div
                  key={c.company}
                  className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-2 text-center"
                >
                  <p className="text-sm font-medium text-white truncate">{c.company}</p>
                  <p className="text-xs text-zinc-400">{c.count} {c.count === 1 ? "job" : "jobs"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

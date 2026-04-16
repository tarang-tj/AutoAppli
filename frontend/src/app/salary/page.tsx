"use client";

import { useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Compensation, CompensationComparison, Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";
import useSWR from "swr";

// ── Helpers ──────────────────────────────────────────────────────

function fmt(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Comparison banner ────────────────────────────────────────────

function ComparisonBanner({ comparison, jobMap }: { comparison: CompensationComparison; jobMap: Map<string, Job> }) {
  if (comparison.count < 2) return null;

  const bestEntry = comparison.entries.find((e) => e.id === comparison.best_total_id);
  const bestJob = bestEntry?.job_id ? jobMap.get(bestEntry.job_id) : null;

  return (
    <Card className="border-emerald-800/50 bg-emerald-950/30">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-emerald-300 text-sm">Offer Comparison</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Best Total Comp</p>
            <p className="text-lg font-bold text-emerald-400">
              {bestEntry ? fmt(bestEntry.total_compensation, bestEntry.currency) : "—"}
            </p>
            {bestJob && (
              <p className="text-xs text-zinc-500 mt-0.5">{bestJob.company}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Average Total</p>
            <p className="text-lg font-bold text-zinc-200">{fmt(comparison.average_total)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Offers Tracked</p>
            <p className="text-lg font-bold text-zinc-200">{comparison.count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── New compensation form ────────────────────────────────────────

function NewCompensationForm({ jobs, onCreated }: { jobs: Job[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [equity, setEquity] = useState("");
  const [signing, setSigning] = useState("");
  const [benefits, setBenefits] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost("/salary", {
        job_id: jobId || null,
        base_salary: parseFloat(baseSalary) || 0,
        bonus: parseFloat(bonus) || 0,
        equity_value: parseFloat(equity) || 0,
        signing_bonus: parseFloat(signing) || 0,
        benefits_value: parseFloat(benefits) || 0,
        notes,
      });
      setJobId("");
      setBaseSalary("");
      setBonus("");
      setEquity("");
      setSigning("");
      setBenefits("");
      setNotes("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  const offerJobs = jobs.filter((j) =>
    ["offer", "interviewing", "applied"].includes(j.status)
  );

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> Add Compensation
      </Button>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Track Compensation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Job</label>
            <select
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Select a job (optional)…</option>
              {offerJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Base Salary</label>
              <Input
                type="number"
                placeholder="135000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Annual Bonus</label>
              <Input
                type="number"
                placeholder="15000"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Equity (annual)</label>
              <Input
                type="number"
                placeholder="40000"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Signing Bonus</label>
              <Input
                type="number"
                placeholder="10000"
                value={signing}
                onChange={(e) => setSigning(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Benefits Value</label>
              <Input
                type="number"
                placeholder="8000"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notes</label>
            <Textarea
              placeholder="Vesting schedule, negotiation notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} size="sm">
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

// ── Compensation breakdown bar ───────────────────────────────────

function CompBreakdownBar({ entry }: { entry: Compensation }) {
  const total = entry.total_compensation || 1;
  const segments = [
    { label: "Base", value: entry.base_salary, color: "bg-blue-500" },
    { label: "Bonus", value: entry.bonus, color: "bg-emerald-500" },
    { label: "Equity", value: entry.equity_value, color: "bg-purple-500" },
    { label: "Signing", value: entry.signing_bonus, color: "bg-amber-500" },
    { label: "Benefits", value: entry.benefits_value, color: "bg-cyan-500" },
  ].filter((s) => s.value > 0);

  return (
    <div className="mt-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all`}
            style={{ width: `${(seg.value / total) * 100}%` }}
            title={`${seg.label}: ${fmt(seg.value, entry.currency)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-xs text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${seg.color}`} />
            {seg.label}: {fmt(seg.value, entry.currency)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Single compensation card ─────────────────────────────────────

function CompensationCard({
  entry,
  job,
  isBest,
  onRefresh,
}: {
  entry: Compensation;
  job?: Job;
  isBest: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    await apiDelete(`/salary/${entry.id}`);
    onRefresh();
  }

  return (
    <Card className={`border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700 ${isBest ? "ring-1 ring-emerald-600/50" : ""}`}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {job ? (
                <h3 className="font-medium text-zinc-100 text-sm">
                  {job.title} — {job.company}
                </h3>
              ) : (
                <h3 className="font-medium text-zinc-100 text-sm">Compensation Package</h3>
              )}
              {isBest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400">
                  <Award className="h-3 w-3" /> Best
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {fmt(entry.total_compensation, entry.currency)}
                </p>
                <p className="text-xs text-zinc-500">Total Compensation ({entry.pay_period})</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-300">
                  {fmt(entry.base_salary, entry.currency)}
                </p>
                <p className="text-xs text-zinc-500">Base Salary</p>
              </div>
            </div>
            {entry.notes && (
              <p className="text-xs text-zinc-400 mt-2">{entry.notes}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-7 px-2 text-red-400 hover:text-red-300 transition-colors"
              aria-label="Delete compensation package"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <BarChart3 className="h-3 w-3" />
          {expanded ? "Hide" : "Show"} Breakdown
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expanded && <CompBreakdownBar entry={entry} />}
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function SalaryPage() {
  const { data: compensations, mutate: refreshComp } = useSWR<Compensation[]>(
    "/salary",
    () => apiGet<Compensation[]>("/salary")
  );
  const { data: comparison } = useSWR<CompensationComparison>(
    "/salary/compare",
    () => apiGet<CompensationComparison>("/salary/compare")
  );
  const { data: jobs } = useSWR<Job[]>("/jobs", () => apiGet<Job[]>("/jobs"));

  const jobMap = new Map((jobs || []).map((j) => [j.id, j]));
  const bestId = comparison?.best_total_id || null;

  const sorted = [...(compensations || [])].sort(
    (a, b) => b.total_compensation - a.total_compensation
  );

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Salary Tracker</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Compare compensation packages and track offers
          </p>
        </div>
        <NewCompensationForm
          jobs={jobs || []}
          onCreated={() => {
            refreshComp();
          }}
        />
      </div>

      {comparison && <ComparisonBanner comparison={comparison} jobMap={jobMap} />}

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4" /> Packages ({sorted.length})
        </h2>
        {!compensations ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-zinc-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-zinc-300 font-medium">No packages tracked yet</p>
              <p className="text-zinc-400 text-sm mt-1 max-w-sm">
                Add a compensation package to start comparing offers side by side.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((entry) => (
              <CompensationCard
                key={entry.id}
                entry={entry}
                job={jobMap.get(entry.job_id || "")}
                isBest={entry.id === bestId}
                onRefresh={refreshComp}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

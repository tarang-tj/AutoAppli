"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useJobs } from "@/hooks/use-jobs";
import type { Job } from "@/types";
import { Download, FileDown, BarChart3, Building2, Globe } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type ExportReport = {
  total_jobs: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  by_company: Record<string, number>;
  top_companies: Array<{ company: string; count: number }>;
  avg_days_in_pipeline: number | null;
  weekly_application_rate: Record<string, number>;
};

export default function ExportPage() {
  const { jobs } = useJobs();
  const { data: report } = useSWR<ExportReport>("/export/report", () => apiGet<ExportReport>("/export/report"));
  const [exporting, setExporting] = useState(false);

  const displayReport = useMemo(() => {
    return report || (jobs.length > 0 ? computeClientReport(jobs) : null);
  }, [report, jobs]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csv = generateCsvFromJobs(jobs);
      downloadFile(csv, "jobs.csv", "text/csv");
      toast.success("CSV exported successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setExporting(true);
      const json = JSON.stringify(jobs, null, 2);
      downloadFile(json, "jobs.json", "application/json");
      toast.success("JSON exported successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export JSON");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = () => {
    toast.info("PDF export coming soon");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Download className="h-7 w-7 text-blue-400" aria-hidden />
          Export {"&"} Reports
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
          Download your job applications data or view a summary report of your job search activity.
        </p>
      </div>

      <div className="space-y-6">
        {/* Export Buttons */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Download Data</CardTitle>
            <CardDescription className="text-zinc-500">Export your job applications in different formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleExportCsv}
                disabled={exporting || jobs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <FileDown className="h-4 w-4 mr-2" aria-hidden />
                Export CSV
              </Button>
              <Button
                onClick={handleExportJson}
                disabled={exporting || jobs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <FileDown className="h-4 w-4 mr-2" aria-hidden />
                Export JSON
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={jobs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden />
                Download Report (PDF)
              </Button>
            </div>
            {jobs.length === 0 && (
              <p className="text-zinc-400 text-sm mt-4">
                Add some job applications to start exporting data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary Report */}
        {displayReport && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" aria-hidden />
                Summary Report
              </CardTitle>
              <CardDescription className="text-zinc-500">Overview of your job search activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total Applications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm font-medium">Total Applications</p>
                  <p className="text-3xl font-bold text-white mt-2">{displayReport.total_jobs}</p>
                </div>
                {displayReport.avg_days_in_pipeline !== null && (
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm font-medium">Avg. Days in Pipeline</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {displayReport.avg_days_in_pipeline.toFixed(1)}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Breakdown */}
              <div>
                <h3 className="text-white font-semibold mb-3">Applications by Status</h3>
                <div className="space-y-2">
                  {Object.entries(displayReport.by_status).map(([status, count]) => {
                    const total = displayReport.total_jobs;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    const colorMap: Record<string, string> = {
                      bookmarked: "bg-blue-600",
                      applied: "bg-cyan-600",
                      interviewing: "bg-purple-600",
                      offer: "bg-green-600",
                      rejected: "bg-red-600",
                      ghosted: "bg-yellow-600",
                    };
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-zinc-300 text-sm capitalize">{status}</span>
                            <span className="text-zinc-400 text-sm">{count}</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${colorMap[status] || "bg-blue-600"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Companies */}
              {displayReport.top_companies.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" aria-hidden />
                    Top Companies
                  </h3>
                  <div className="space-y-2">
                    {displayReport.top_companies.slice(0, 5).map((item, idx) => (
                      <div key={item.company} className="flex justify-between items-center bg-zinc-800 rounded p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 text-sm font-medium w-5">{idx + 1}.</span>
                          <span className="text-zinc-200">{item.company}</span>
                        </div>
                        <span className="text-zinc-400">{item.count} apps</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Breakdown */}
              {Object.keys(displayReport.by_source).length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" aria-hidden />
                    Applications by Source
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(displayReport.by_source).map(([source, count]) => (
                      <div key={source} className="bg-zinc-800 rounded p-3 text-center">
                        <p className="text-zinc-400 text-sm capitalize">{source}</p>
                        <p className="text-2xl font-bold text-white mt-1">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly Activity */}
              {Object.keys(displayReport.weekly_application_rate).length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">Weekly Activity (Last 8 Weeks)</h3>
                  <div className="space-y-2">
                    {Object.entries(displayReport.weekly_application_rate).map(([week, count]) => {
                      const maxCount = Math.max(
                        ...Object.values(displayReport.weekly_application_rate)
                      );
                      const percent = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                      return (
                        <div key={week} className="flex items-center gap-3">
                          <span className="text-zinc-400 text-sm w-16">{week}</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 bg-zinc-700 rounded h-2">
                              <div className="bg-blue-600 h-2 rounded" style={{ width: `${percent}%` }} />
                            </div>
                            <span className="text-zinc-300 text-sm w-8 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function generateCsvFromJobs(jobs: Job[]): string {
  if (jobs.length === 0) return "";

  const headers = ["id", "company", "title", "url", "status", "source", "applied_at", "notes", "created_at"];
  const rows = jobs.map((job) =>
    headers
      .map((h) => {
        const value = job[h as keyof Job];
        const str = value ? String(value) : "";
        // Escape quotes and wrap in quotes if contains comma
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function computeClientReport(jobs: Job[]): ExportReport {
  const total = jobs.length;

  // Status breakdown
  const byStatus: Record<string, number> = {};
  const statusOrder = ["bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted"];
  for (const status of statusOrder) {
    byStatus[status] = jobs.filter((j) => j.status === status).length;
  }

  // Source breakdown
  const bySource: Record<string, number> = {};
  for (const job of jobs) {
    bySource[job.source] = (bySource[job.source] || 0) + 1;
  }

  // Company breakdown
  const byCompany: Record<string, number> = {};
  for (const job of jobs) {
    if (job.company) {
      byCompany[job.company] = (byCompany[job.company] || 0) + 1;
    }
  }
  const topCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => ({ company, count }));

  // Average days in pipeline
  const durations: number[] = [];
  for (const job of jobs) {
    if (job.created_at && job.updated_at) {
      const created = new Date(job.created_at).getTime();
      const updated = new Date(job.updated_at).getTime();
      const days = Math.abs(updated - created) / (1000 * 60 * 60 * 24);
      durations.push(days);
    }
  }
  const avgDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

  // Weekly activity
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const weeklyActivity: Record<string, number> = {};

  for (let i = 0; i < 8; i++) {
    const weekStart = now - (8 - i) * WEEK;
    const weekEnd = weekStart + WEEK;
    const count = jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= weekStart && t < weekEnd;
    }).length;
    weeklyActivity[`Week ${i + 1}`] = count;
  }

  return {
    total_jobs: total,
    by_status: byStatus,
    by_source: bySource,
    by_company: byCompany,
    top_companies: topCompanies,
    avg_days_in_pipeline: avgDays,
    weekly_application_rate: weeklyActivity,
  };
}

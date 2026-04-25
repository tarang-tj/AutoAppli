"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs } from "@/hooks/use-jobs";
import {
  getDeadlinesDownloadUrl,
  getDeadlinesWebcalUrl,
} from "@/lib/ical-link";
import type { Job } from "@/types";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Download,
  FileDown,
  FileText,
  Globe,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  const [exporting, setExporting] = useState(false);

  const displayReport = useMemo(() => {
    return jobs.length > 0 ? computeClientReport(jobs) : null;
  }, [jobs]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csv = generateCsvFromJobs(jobs);
      downloadFile(csv, "autoappli-jobs.csv", "text/csv");
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
      downloadFile(json, "autoappli-jobs.json", "application/json");
      toast.success("JSON exported successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export JSON");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!displayReport) return;
    try {
      setExporting(true);
      toast.info("Generating PDF report…");
      await generatePdfReport(displayReport, jobs);
      toast.success("PDF report downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Download className="h-7 w-7 text-blue-400" aria-hidden="true" />
          Export &amp; Reports
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
                aria-busy={exporting}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <FileDown className="h-4 w-4 mr-2" aria-hidden="true" />
                Export CSV
              </Button>
              <Button
                onClick={handleExportJson}
                disabled={exporting || jobs.length === 0}
                aria-busy={exporting}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                <FileDown className="h-4 w-4 mr-2" aria-hidden="true" />
                Export JSON
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={exporting || jobs.length === 0}
                aria-busy={exporting}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
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

        {/* Calendar (iCal) — subscribe or download deadlines */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-400" aria-hidden="true" />
              Calendar (iCal)
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Add your saved-job deadlines to Google Calendar, Apple Calendar, or
              Outlook. Updates as you save new roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              aria-describedby="ical-note"
            >
              <a
                href={getDeadlinesDownloadUrl()}
                download="autoappli-deadlines.ics"
                aria-label="Download saved-job deadlines as an iCal (.ics) file"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Download .ics
              </a>
              <a
                href={getDeadlinesWebcalUrl()}
                aria-label="Subscribe to your AutoAppli deadlines in your calendar app"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Subscribe in Calendar
              </a>
            </div>
            <p id="ical-note" className="text-zinc-400 text-xs mt-3">
              The webcal subscription updates daily. Download is a one-time snapshot.
            </p>
          </CardContent>
        </Card>

        {/* Summary Report */}
        {displayReport && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" aria-hidden="true" />
                Summary Report
              </CardTitle>
              <CardDescription className="text-zinc-500">Overview of your job search activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Total Applications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <p className="text-zinc-400 text-sm font-medium">Total Applications</p>
                  <p className="text-3xl font-bold text-white mt-2 tabular-nums">{displayReport.total_jobs}</p>
                </div>
                {displayReport.avg_days_in_pipeline !== null && (
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm font-medium">Avg. Days in Pipeline</p>
                    <p className="text-3xl font-bold text-white mt-2 tabular-nums">
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
                            <span className="text-zinc-400 text-sm tabular-nums">{count} ({percent}%)</span>
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
                    <Building2 className="h-4 w-4 text-blue-400" aria-hidden="true" />
                    Top Companies
                  </h3>
                  <div className="space-y-2">
                    {displayReport.top_companies.slice(0, 5).map((item, idx) => (
                      <div key={item.company} className="flex justify-between items-center bg-zinc-800 rounded p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 text-sm font-medium w-5">{idx + 1}.</span>
                          <span className="text-zinc-200">{item.company}</span>
                        </div>
                        <span className="text-zinc-400 tabular-nums">{item.count} apps</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Breakdown */}
              {Object.keys(displayReport.by_source).length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" aria-hidden="true" />
                    Applications by Source
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(displayReport.by_source).map(([source, count]) => (
                      <div key={source} className="bg-zinc-800 rounded p-3 text-center">
                        <p className="text-zinc-400 text-sm capitalize">{source}</p>
                        <p className="text-2xl font-bold text-white mt-1 tabular-nums">{count}</p>
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
                            <span className="text-zinc-300 text-sm w-8 text-right tabular-nums">{count}</span>
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

// ── CSV generation ───────────────────────────────────────────────────

function generateCsvFromJobs(jobs: Job[]): string {
  if (jobs.length === 0) return "";

  const headers = ["id", "company", "title", "url", "status", "source", "applied_at", "notes", "created_at"];
  const rows = jobs.map((job) =>
    headers
      .map((h) => {
        const value = job[h as keyof Job];
        const str = value ? String(value) : "";
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// ── File download helper ─────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── PDF report generation ────────────────────────────────────────────

async function generatePdfReport(report: ExportReport, jobs: Job[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // ── Header ──
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("AutoAppli", margin, 18);
  doc.setFontSize(11);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text("Job Search Report", margin, 26);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 33);
  y = 50;

  // ── Summary stats ──
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Summary", margin, y);
  y += 8;

  const statsData = [
    ["Total Applications", String(report.total_jobs)],
    ["Avg. Days in Pipeline", report.avg_days_in_pipeline !== null ? report.avg_days_in_pipeline.toFixed(1) : "N/A"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: statsData,
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 80 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // ── Status breakdown ──
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Applications by Status", margin, y);
  y += 8;

  const statusColors: Record<string, [number, number, number]> = {
    bookmarked: [59, 130, 246],
    applied: [6, 182, 212],
    interviewing: [147, 51, 234],
    offer: [34, 197, 94],
    rejected: [239, 68, 68],
    ghosted: [234, 179, 8],
  };

  const statusRows = Object.entries(report.by_status).map(([status, count]) => {
    const pct = report.total_jobs > 0 ? Math.round((count / report.total_jobs) * 100) : 0;
    return [status.charAt(0).toUpperCase() + status.slice(1), String(count), `${pct}%`];
  });

  autoTable(doc, {
    startY: y,
    head: [["Status", "Count", "Percentage"]],
    body: statusRows,
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    didParseCell: (data: unknown) => {
      const d = data as { section: string; column: { index: number }; row: { index: number }; cell: { styles: { fillColor: unknown } } };
      if (d.section === "body" && d.column.index === 0) {
        const status = statusRows[d.row.index]?.[0]?.toLowerCase();
        if (status && statusColors[status]) {
          d.cell.styles.fillColor = statusColors[status];
        }
      }
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Check if we need a new page
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // ── Top companies ──
  if (report.top_companies.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Top Companies", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["#", "Company", "Applications"]],
      body: report.top_companies.slice(0, 10).map((c, i) => [
        String(i + 1),
        c.company,
        String(c.count),
      ]),
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 15, halign: "center" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // ── Source breakdown ──
  if (Object.keys(report.by_source).length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Applications by Source", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Source", "Count"]],
      body: Object.entries(report.by_source)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => [
          source.charAt(0).toUpperCase() + source.slice(1),
          String(count),
        ]),
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  // ── Weekly Activity ──
  if (Object.keys(report.weekly_application_rate).length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Weekly Activity (Last 8 Weeks)", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Week", "Applications"]],
      body: Object.entries(report.weekly_application_rate).map(([week, count]) => [week, String(count)]),
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ── Full job listing table ──
  if (jobs.length > 0 && jobs.length <= 200) {
    doc.addPage();
    y = 20;
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("All Applications", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Company", "Title", "Status", "Source", "Date Added"]],
      body: jobs.map((j) => [
        j.company,
        j.title,
        j.status.charAt(0).toUpperCase() + j.status.slice(1),
        j.source,
        new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      ]),
      theme: "striped",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
      },
    });
  }

  // ── Footer on each page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `AutoAppli Report - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save("autoappli-report.pdf");
}

// ── Client-side report computation ───────────────────────────────────

function computeClientReport(jobs: Job[]): ExportReport {
  const total = jobs.length;

  const byStatus: Record<string, number> = {};
  const statusOrder = ["bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted"];
  for (const status of statusOrder) {
    byStatus[status] = jobs.filter((j) => j.status === status).length;
  }

  const bySource: Record<string, number> = {};
  for (const job of jobs) {
    bySource[job.source] = (bySource[job.source] || 0) + 1;
  }

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

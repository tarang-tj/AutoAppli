"use client";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { PipelineStats } from "@/components/dashboard/pipeline-stats";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, isJobsApiConfigured } from "@/lib/api";
import { downloadJobsCsv } from "@/lib/export-jobs-csv";
import { filterJobsByQuery } from "@/lib/filter-jobs";
import { normalizeJobUrl } from "@/lib/job-url";
import { useJobs } from "@/hooks/use-jobs";
import type { Job } from "@/types";
import { Download, LayoutGrid, ListFilter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { jobs, mutate, isLoading } = useJobs();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [boardSearch, setBoardSearch] = useState("");

  const filteredJobs = useMemo(
    () => filterJobsByQuery(jobs, boardSearch),
    [jobs, boardSearch]
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const rawUrl = String(form.get("url") ?? "").trim();
    try {
      const res = await apiPost<Job>("/jobs", {
        company: form.get("company"),
        title: form.get("title"),
        url: normalizeJobUrl(rawUrl),
        description: (form.get("description") as string) || undefined,
        fetch_full_description: form.get("fetch_full_description") === "on",
      });
      if (res.duplicate) {
        toast.info("Already on your board");
      } else {
        toast.success("Job added to tracker");
      }
      setOpen(false);
      (e.target as HTMLFormElement).reset();
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add job");
    } finally {
      setCreating(false);
    }
  };

  const handleExportCsv = () => {
    const rows = boardSearch.trim() ? filteredJobs : jobs;
    if (rows.length === 0) {
      toast.error("No jobs to export");
      return;
    }
    downloadJobsCsv(
      rows,
      boardSearch.trim() ? "autoappli-jobs-filtered.csv" : "autoappli-jobs.csv"
    );
    toast.success(`Exported ${rows.length} job${rows.length === 1 ? "" : "s"}`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Job Tracker</h1>
          <p className="text-zinc-200 text-sm mt-1.5 leading-snug max-w-xl">
            Track and manage your job applications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/jobs"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-zinc-600 text-zinc-100 no-underline bg-zinc-900/50 hover:bg-zinc-800"
            )}
          >
            <Search className="h-4 w-4 mr-2" />
            Job search
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-600 text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800"
            disabled={jobs.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" />}>
              <Plus className="h-4 w-4 mr-2" />
              Add Job
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Job</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-200">Company *</Label>
                  <Input name="company" required className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-200">Job Title *</Label>
                  <Input name="title" required className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-200">Job posting URL</Label>
                  <Input
                    name="url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="e.g. careers.acme.com/roles/123 or https://…"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-400">
                    https:// is added automatically when omitted.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-200">Job Description</Label>
                  <Textarea name="description" rows={4} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <label className="flex items-start gap-2 text-sm text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="fetch_full_description"
                    className="mt-1 rounded border-zinc-600 bg-zinc-800 text-blue-600"
                  />
                  <span>
                    Fetch full description from posting URL (Indeed-style pages; slower, better for
                    resume tailoring)
                  </span>
                </label>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={creating}>
                  {creating ? "Adding..." : "Add Job"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="relative mb-4 max-w-md">
          <ListFilter
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 pointer-events-none"
            aria-hidden
          />
          <Input
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            placeholder="Filter board by title, company, notes…"
            aria-label="Filter jobs on board"
            className="bg-zinc-900 border-zinc-600 pl-9 text-zinc-50 placeholder:text-zinc-500"
          />
        </div>
      ) : null}

      {!isJobsApiConfigured() ? (
        <div className="mb-4 max-w-2xl rounded-lg border border-zinc-600 bg-zinc-800/90 px-3 py-2.5">
          <p className="text-sm text-zinc-100 leading-relaxed">
            Jobs are stored in this browser until you set{" "}
            <code className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-sky-200">
              NEXT_PUBLIC_API_URL
            </code>{" "}
            for a shared backend. Drag cards between columns to update status.
          </p>
        </div>
      ) : null}

      {jobs.length > 0 ? (
        <p className="text-xs text-zinc-300 mb-3 max-w-2xl leading-relaxed">
          <span className="text-zinc-100 font-semibold">From a card:</span> sparkles opens{" "}
          <strong className="text-white">Resume Builder</strong> with that role; the send icon opens{" "}
          <strong className="text-white">Outreach</strong> with title, company, and job context filled in.
        </p>
      ) : null}

      <PipelineStats jobs={filteredJobs} allJobCount={jobs.length} />

      {!isLoading && jobs.length === 0 ? (
        <Card className="mb-6 bg-zinc-900/90 border-zinc-700 border-dashed">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-start gap-3 text-center sm:text-left">
              <LayoutGrid className="h-10 w-10 text-zinc-500 shrink-0 hidden sm:block" />
              <div>
                <p className="text-zinc-50 font-medium">No roles on your board yet</p>
                <p className="text-zinc-300 text-sm mt-1 leading-relaxed">
                  Add a job manually or save listings from Job Search. Then drag cards across stages
                  (Bookmarked → Applied → Interviewing…).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add job
              </Button>
              <Link
                href="/jobs"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-zinc-600 text-zinc-100 bg-zinc-900/50 no-underline inline-flex items-center justify-center hover:bg-zinc-800"
                )}
              >
                <Search className="h-4 w-4 mr-2" />
                Browse jobs
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <KanbanBoard searchQuery={boardSearch} />
    </div>
  );
}

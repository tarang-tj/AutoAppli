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
import { normalizeJobUrl } from "@/lib/job-url";
import { useJobs } from "@/hooks/use-jobs";
import type { Job } from "@/types";
import { LayoutGrid, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { jobs, mutate, isLoading } = useJobs();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Tracker</h1>
          <p className="text-zinc-300 text-sm mt-1">Track and manage your job applications</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/jobs"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "border-zinc-600 text-zinc-200 no-underline"
            )}
          >
            <Search className="h-4 w-4 mr-2" />
            Job search
          </Link>
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
                <Label className="text-zinc-300">Company *</Label>
                <Input name="company" required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Job Title *</Label>
                <Input name="title" required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Job posting URL</Label>
                <Input
                  name="url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="e.g. careers.acme.com/roles/123 or https://…"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <p className="text-xs text-zinc-500">
                  https:// is added automatically when omitted.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Job Description</Label>
                <Textarea name="description" rows={4} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  name="fetch_full_description"
                  className="mt-1 rounded border-zinc-600 bg-zinc-800 text-blue-600"
                />
                <span>
                  Fetch full description from posting URL (Indeed-style pages; slower, better for resume
                  tailoring)
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

      {!isJobsApiConfigured() ? (
        <p className="text-xs text-zinc-500 mb-4 max-w-2xl">
          Jobs are stored in this browser until you set{" "}
          <code className="text-zinc-400">NEXT_PUBLIC_API_URL</code> for a shared backend. Drag cards
          between columns to update status.
        </p>
      ) : null}

      <PipelineStats jobs={jobs} />

      {!isLoading && jobs.length === 0 ? (
        <Card className="mb-6 bg-zinc-900/80 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-start gap-3 text-center sm:text-left">
              <LayoutGrid className="h-10 w-10 text-zinc-600 shrink-0 hidden sm:block" />
              <div>
                <p className="text-zinc-200 font-medium">No roles on your board yet</p>
                <p className="text-zinc-500 text-sm mt-1">
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
                  "border-zinc-600 text-zinc-200 no-underline inline-flex items-center justify-center"
                )}
              >
                <Search className="h-4 w-4 mr-2" />
                Browse jobs
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <KanbanBoard />
    </div>
  );
}

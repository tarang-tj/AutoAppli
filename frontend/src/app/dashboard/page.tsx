"use client";
import { RecommendedJobs } from "@/components/dashboard/recommended-jobs";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { InsightsCards } from "@/components/dashboard/insights-cards";
import { PipelineStats } from "@/components/dashboard/pipeline-stats";
import { DemoModeBanner } from "@/components/dashboard/demo-mode-banner";
import { OnboardingTour } from "@/components/dashboard/onboarding-tour";
import { ActivationChecklist } from "@/components/dashboard/activation-checklist";
import { WeeklyDigest } from "@/components/dashboard/weekly-digest";
import { ActionRadar } from "@/components/dashboard/action-radar";
import { OutcomesBreakdown } from "@/components/dashboard/outcomes-breakdown";
import { StaleJobsNudge } from "@/components/dashboard/stale-jobs-nudge";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, isJobsApiConfigured } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { downloadJobsCsv } from "@/lib/export-jobs-csv";
import { filterJobsByQuery } from "@/lib/filter-jobs";
import { normalizeJobUrl } from "@/lib/job-url";
import { useJobs } from "@/hooks/use-jobs";
import type { Job } from "@/types";
import { ChevronDown, ChevronUp, Download, LayoutGrid, ListFilter, Plus, Search, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  // useSearchParams triggers a CSR bailout during static prerender —
  // wrapping the real content in Suspense lets Next.js build the page
  // without erroring, and the actual params resolve on the client.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { jobs, mutate, isLoading, closeOutJob, archiveJob } = useJobs();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [boardSearch, setBoardSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const archivedCount = useMemo(
    () => jobs.filter((j) => j.archived).length,
    [jobs]
  );
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Prefill values when reaching /dashboard?add=1&url=...&title=...&company=...
  // (Used by the command palette and /bookmarklet. Empty when absent.)
  const prefill = useMemo(
    () => ({
      url: searchParams?.get("url") ?? "",
      title: searchParams?.get("title") ?? "",
      company: searchParams?.get("company") ?? "",
      description: searchParams?.get("description") ?? "",
    }),
    [searchParams]
  );

  // Auto-open the Add Job dialog on ?add=1, then strip the params so the
  // dialog doesn't reappear on a navigation/refresh.
  useEffect(() => {
    if (searchParams?.get("add") === "1") {
      setOpen(true);
      const url = new URL(window.location.href);
      ["add", "url", "title", "company", "description"].forEach((k) => url.searchParams.delete(k));
      router.replace(url.pathname + (url.search ? url.search : ""));
    }
    // Only run on initial render — searchParams change when we replace above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredJobs = useMemo(
    () => filterJobsByQuery(jobs, boardSearch),
    [jobs, boardSearch]
  );

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const rawUrl = String(form.get("url") ?? "").trim();
    const salMinRaw = String(form.get("salary_min") ?? "").trim();
    const salMaxRaw = String(form.get("salary_max") ?? "").trim();
    try {
      const res = await apiPost<Job>("/jobs", {
        company: form.get("company"),
        title: form.get("title"),
        url: normalizeJobUrl(rawUrl),
        description: (form.get("description") as string) || undefined,
        fetch_full_description: form.get("fetch_full_description") === "on",
        // Rich fields
        salary_min: salMinRaw ? Number(salMinRaw) : undefined,
        salary_max: salMaxRaw ? Number(salMaxRaw) : undefined,
        salary_currency: (form.get("salary_currency") as string) || "USD",
        location: (form.get("location") as string) || undefined,
        remote_type: (form.get("remote_type") as string) || undefined,
        job_type: (form.get("job_type") as string) || undefined,
        experience_level: (form.get("experience_level") as string) || undefined,
        skills: skills.length > 0 ? skills : undefined,
        priority: Number(form.get("priority") || 0) || undefined,
        department: (form.get("department") as string) || undefined,
        application_email: (form.get("application_email") as string) || undefined,
        company_website: (form.get("company_website") as string) || undefined,
        recruiter_name: (form.get("recruiter_name") as string) || undefined,
        deadline: (form.get("deadline") as string) || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      if (res.duplicate) {
        toast.info("Already on your board");
      } else {
        toast.success("Job added to tracker");
      }
      setOpen(false);
      setShowAdvanced(false);
      setSkills([]);
      setTags([]);
      setSkillInput("");
      setTagInput("");
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

  // Show skeleton on initial fetch so users don't see a blank dashboard.
  // `jobs.length === 0 && isLoading` covers first paint only — once we have
  // any jobs cached (or confirmed zero), the full UI renders with its own
  // section-level empty state.
  if (isLoading && jobs.length === 0) {
    return (
      <div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <OnboardingTour />
      <DemoModeBanner />
      <ActivationChecklist />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Job Tracker</h1>
          <p className="text-zinc-200 text-sm mt-1.5 leading-snug max-w-xl">
            Track and manage your job applications
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle className="text-zinc-200 hover:text-white" />
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
              <form onSubmit={handleCreate} aria-busy={creating} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="job-company" className="text-zinc-200">Company *</Label>
                  <Input id="job-company" name="company" required autoComplete="off" defaultValue={prefill.company} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-title" className="text-zinc-200">Job Title *</Label>
                  <Input id="job-title" name="title" required autoComplete="off" defaultValue={prefill.title} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-url" className="text-zinc-200">Job posting URL</Label>
                  <Input
                    id="job-url"
                    name="url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    defaultValue={prefill.url}
                    placeholder="e.g. careers.acme.com/roles/123 or https://…"
                    aria-describedby="job-url-hint"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p id="job-url-hint" className="text-xs text-zinc-400">https:// is added automatically when omitted.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="job-location" className="text-zinc-200">Location</Label>
                    <Input id="job-location" name="location" autoComplete="off" placeholder="San Francisco, CA" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-remote-type" className="text-zinc-200">Work model</Label>
                    <select id="job-remote-type" name="remote_type" className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2">
                      <option value="">Not specified</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="job-salary-min" className="text-zinc-200">Salary min</Label>
                    <Input id="job-salary-min" name="salary_min" type="number" inputMode="numeric" autoComplete="off" placeholder="80000" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-salary-max" className="text-zinc-200">Salary max</Label>
                    <Input id="job-salary-max" name="salary_max" type="number" inputMode="numeric" autoComplete="off" placeholder="120000" className="bg-zinc-800 border-zinc-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="job-type" className="text-zinc-200">Job type</Label>
                    <select id="job-type" name="job_type" className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2">
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-experience-level" className="text-zinc-200">Level</Label>
                    <select id="job-experience-level" name="experience_level" className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2">
                      <option value="intern">Intern</option>
                      <option value="entry">Entry</option>
                      <option value="mid">Mid-level</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                      <option value="director">Director</option>
                      <option value="vp">VP</option>
                      <option value="c_level">C-level</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-skill-input" className="text-zinc-200">Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      id="job-skill-input"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Type a skill and press Enter"
                      autoComplete="off"
                      aria-describedby="job-skill-hint"
                      className="bg-zinc-800 border-zinc-700 text-white flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = skillInput.trim();
                          if (v && !skills.includes(v)) setSkills([...skills, v]);
                          setSkillInput("");
                        }
                      }}
                    />
                  </div>
                  <p id="job-skill-hint" className="sr-only">
                    Press Enter to add a skill. Each skill can be removed individually.
                  </p>
                  {skills.length > 0 && (
                    <ul aria-label="Selected skills" className="flex flex-wrap gap-1 mt-1 list-none p-0">
                      {skills.map((s) => (
                        <li key={s} className="inline-flex items-center gap-1 rounded bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-xs text-violet-200">
                          {s}
                          <button
                            type="button"
                            aria-label={`Remove skill ${s}`}
                            className="text-violet-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                            onClick={() => setSkills(skills.filter((x) => x !== s))}
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-priority" className="text-zinc-200">Priority</Label>
                  <select id="job-priority" name="priority" className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2">
                    <option value="0">None</option>
                    <option value="1">1 star</option>
                    <option value="2">2 stars</option>
                    <option value="3">3 stars</option>
                    <option value="4">4 stars</option>
                    <option value="5">5 stars</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-description" className="text-zinc-200">Job Description</Label>
                  <Textarea id="job-description" name="description" rows={3} defaultValue={prefill.description} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>

                {/* ── Advanced fields toggle ─────────── */}
                <button
                  type="button"
                  aria-expanded={showAdvanced}
                  aria-controls="job-advanced-fields"
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? <ChevronUp aria-hidden="true" className="h-3 w-3" /> : <ChevronDown aria-hidden="true" className="h-3 w-3" />}
                  {showAdvanced ? "Hide" : "Show"} advanced fields
                </button>

                {showAdvanced && (
                  <div id="job-advanced-fields" className="space-y-4 border-t border-zinc-700/50 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="job-department" className="text-zinc-200">Department</Label>
                        <Input id="job-department" name="department" autoComplete="off" placeholder="Engineering" className="bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job-deadline" className="text-zinc-200">Deadline</Label>
                        <Input id="job-deadline" name="deadline" type="date" autoComplete="off" className="bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="job-recruiter-name" className="text-zinc-200">Recruiter name</Label>
                        <Input id="job-recruiter-name" name="recruiter_name" autoComplete="off" placeholder="Jane Smith" className="bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job-application-email" className="text-zinc-200">Application email</Label>
                        <Input id="job-application-email" name="application_email" type="email" autoComplete="off" spellCheck={false} placeholder="jobs@company.com" className="bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-company-website" className="text-zinc-200">Company website</Label>
                      <Input id="job-company-website" name="company_website" type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://company.com" className="bg-zinc-800 border-zinc-700 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-tag-input" className="text-zinc-200">Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          id="job-tag-input"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          placeholder="e.g. dream_job, referral, FAANG"
                          autoComplete="off"
                          aria-describedby="job-tag-hint"
                          className="bg-zinc-800 border-zinc-700 text-white flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const v = tagInput.trim();
                              if (v && !tags.includes(v)) setTags([...tags, v]);
                              setTagInput("");
                            }
                          }}
                        />
                      </div>
                      <p id="job-tag-hint" className="sr-only">
                        Press Enter to add a tag. Each tag can be removed individually.
                      </p>
                      {tags.length > 0 && (
                        <ul aria-label="Selected tags" className="flex flex-wrap gap-1 mt-1 list-none p-0">
                          {tags.map((t) => (
                            <li key={t} className="inline-flex items-center gap-1 rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-200">
                              {t}
                              <button
                                type="button"
                                aria-label={`Remove tag ${t}`}
                                className="text-blue-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                                onClick={() => setTags(tags.filter((x) => x !== t))}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

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
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={creating}
                  aria-busy={creating}
                >
                  {creating ? "Adding…" : "Add Job"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative max-w-md flex-1">
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
          {archivedCount > 0 ? (
            <label className="inline-flex items-center gap-2 text-sm text-zinc-200 select-none cursor-pointer rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 hover:bg-zinc-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 accent-amber-400"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
              <span className="text-xs text-zinc-400 tabular-nums">
                ({archivedCount})
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {!isJobsApiConfigured() ? (
        <div className="mb-4 max-w-2xl rounded-lg border border-zinc-600 bg-zinc-800/90 px-3 py-2.5">
          <p className="text-sm text-zinc-100 leading-relaxed">
            {isSupabaseConfigured() ? (
              <>
                Jobs are saved directly to your Supabase database — no FastAPI needed. Set{" "}
                <code className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-sky-200">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                if you want the FastAPI-backed workflow with server-side match scoring. Drag cards between columns to update status.
              </>
            ) : (
              <>
                Jobs are stored in this browser until you configure Supabase env vars or set{" "}
                <code className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-xs font-mono text-sky-200">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                for a shared backend. Drag cards between columns to update status.
              </>
            )}
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

      <StaleJobsNudge
        closeOutJob={closeOutJob}
        archiveJob={archiveJob}
        mutateJobs={mutate}
      />
      <WeeklyDigest jobs={jobs} />
      <ActionRadar />
      <InsightsCards jobs={jobs} />
      <OutcomesBreakdown jobs={jobs} />
      <PipelineStats jobs={filteredJobs} allJobCount={jobs.length} />
      <RecommendedJobs userSkills={[]} remotePreference={null} displayCount={10} />

      {!isLoading && jobs.length === 0 ? (
        <Card className="mb-6 bg-zinc-900/90 border-zinc-700 border-dashed">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
            <div className="flex items-start gap-3 text-center sm:text-left">
              <LayoutGrid className="h-10 w-10 text-zinc-500 shrink-0 hidden sm:block" />
              <div>
                <p className="text-zinc-50 font-medium">No roles on your board yet</p>
                <p className="text-zinc-300 text-sm mt-1 leading-relaxed">
                  Add a job manually or save listings from Job Search. Then drag cards across stages
                  (Bookmarked → Applied → Interviewing…). Use sparkles or send on any card to open{" "}
                  <strong className="text-zinc-100">Resume</strong> or <strong className="text-zinc-100">Outreach</strong>{" "}
                  with that role prefilled.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
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
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  href="/resume"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "border-violet-500/40 text-violet-200 bg-zinc-900/50 no-underline inline-flex items-center justify-center hover:bg-violet-950/40"
                  )}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Resume Builder
                </Link>
                <Link
                  href="/outreach"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "border-emerald-500/40 text-emerald-200 bg-zinc-900/50 no-underline inline-flex items-center justify-center hover:bg-emerald-950/30"
                  )}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Outreach
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <KanbanBoard searchQuery={boardSearch} showArchived={showArchived} />
    </div>
  );
}

"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import type { Job, JobSearchResult } from "@/types";
import {
  Bookmark,
  ExternalLink,
  FileText,
  MapPin,
  Building2,
  DollarSign,
  CalendarClock,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  LinkedIn: { bg: "bg-blue-500/15", text: "text-blue-400" },
  Indeed: { bg: "bg-purple-500/15", text: "text-purple-400" },
  Handshake: { bg: "bg-orange-500/15", text: "text-orange-400" },
};

function formatDate(d?: string | null): string | null {
  if (!d) return null;
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function isClosingSoon(d?: string | null): boolean {
  if (!d) return false;
  try {
    const closing = new Date(d + "T23:59:59");
    const now = new Date();
    const diff = closing.getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
  } catch {
    return false;
  }
}

function isPastDeadline(d?: string | null): boolean {
  if (!d) return false;
  try {
    const closing = new Date(d + "T23:59:59");
    return closing.getTime() < Date.now();
  } catch {
    return false;
  }
}

export function JobListingCard({ job }: { job: JobSearchResult }) {
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saved, setSaved] = useState(false);

  const postJob = async (fetchFullDescription: boolean) => {
    const body = {
      company: job.company,
      title: job.title,
      url: job.url,
      description: job.snippet,
      source: job.source,
      fetch_full_description: fetchFullDescription,
    };
    const created = await apiPost<Job>("/jobs", body);
    setSaved(true);
    if (created.duplicate) {
      toast.info("Already in your tracker");
      return;
    }
    toast.success(
      fetchFullDescription ? "Saved with posting description" : "Saved to tracker"
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await postJob(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleImportDescription = async () => {
    if (!job.url?.trim()) {
      toast.error("No URL to scrape");
      return;
    }
    setImporting(true);
    try {
      await postJob(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  };

  const sourceStyle = SOURCE_STYLES[job.source] || { bg: "bg-zinc-800", text: "text-zinc-400" };
  const postedFormatted = formatDate(job.posted_date);
  const closingFormatted = formatDate(job.closing_date);
  const closingSoon = isClosingSoon(job.closing_date);
  const pastDeadline = isPastDeadline(job.closing_date);

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white leading-snug">{job.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Building2 aria-hidden="true" className="h-3 w-3 shrink-0" />
                {job.company}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
                {job.location}
              </span>
              {job.salary && (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <DollarSign aria-hidden="true" className="h-3 w-3 shrink-0" />
                  {job.salary}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{job.snippet}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Save to tracker"
                aria-label={
                  saved
                    ? `${job.title} at ${job.company} — saved`
                    : `Save ${job.title} at ${job.company} to tracker`
                }
                aria-busy={saving}
                onClick={handleSave}
                disabled={saving || importing || saved}
                className={saved ? "text-blue-400" : "text-zinc-500 hover:text-white"}
              >
                <Bookmark aria-hidden="true" className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Save and pull full job description from posting (slower)"
                aria-label={`Save ${job.title} and scrape full description (slower)`}
                aria-busy={importing}
                onClick={handleImportDescription}
                disabled={saving || importing || saved || !job.url?.trim()}
                className="text-zinc-500 hover:text-amber-400"
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(job.url, "_blank")}
                aria-label={`Open ${job.title} at ${job.company} posting in new tab`}
                className="text-zinc-500 hover:text-white"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
            {(saving || importing) && (
              <span role="status" aria-live="polite" className="text-[10px] text-zinc-500">
                {importing ? "Scraping…" : "Saving…"}
              </span>
            )}
          </div>
        </div>

        {/* Footer: source, dates */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[10px] border-0 font-medium ${sourceStyle.bg} ${sourceStyle.text}`}
            >
              {job.source}
            </Badge>
            {postedFormatted && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Calendar aria-hidden="true" className="h-2.5 w-2.5" />
                Posted {postedFormatted}
              </span>
            )}
          </div>
          {closingFormatted && (
            <span
              className={`flex items-center gap-1 text-[10px] font-medium ${
                pastDeadline
                  ? "text-red-400/70 line-through"
                  : closingSoon
                  ? "text-amber-400"
                  : "text-zinc-500"
              }`}
            >
              <CalendarClock aria-hidden="true" className="h-2.5 w-2.5" />
              {pastDeadline ? "Closed" : closingSoon ? "Closing soon:" : "Closes"}{" "}
              {closingFormatted}
            </span>
          )}
          {!job.closing_date && (
            <span className="text-[10px] text-zinc-600 italic">Rolling admission</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

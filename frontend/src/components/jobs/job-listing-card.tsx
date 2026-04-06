"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import type { JobSearchResult } from "@/types";
import { Bookmark, ExternalLink, MapPin, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function JobListingCard({ job }: { job: JobSearchResult }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost("/jobs", { company: job.company, title: job.title, url: job.url, description: job.snippet, source: job.source, status: "bookmarked" });
      setSaved(true);
      toast.success("Saved to tracker!");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };
  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white">{job.title}</h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-zinc-400"><Building2 className="h-3 w-3" />{job.company}</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400"><MapPin className="h-3 w-3" />{job.location}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{job.snippet}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleSave} disabled={saving || saved} className={saved ? "text-blue-400" : "text-zinc-500 hover:text-white"}>
              <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.open(job.url, "_blank")} className="text-zinc-500 hover:text-white">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500 capitalize">{job.source}</Badge>
          {job.posted_date && <span className="text-[10px] text-zinc-600">{job.posted_date}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

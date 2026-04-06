"use client";
import { Job } from "@/types";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { normalizeJobUrl } from "@/lib/job-url";
import { cn } from "@/lib/utils";
import { Building2, ExternalLink } from "lucide-react";

interface JobCardProps { job: Job; index: number; }

export function JobCard({ job, index }: JobCardProps) {
  const date = new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const linkHref = normalizeJobUrl(job.url);
  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={cn(
            "bg-zinc-900 border-zinc-800 cursor-grab touch-manipulation active:cursor-grabbing select-none",
            snapshot.isDragging &&
              "shadow-xl shadow-black/30 ring-1 ring-blue-500/30 opacity-[0.97] z-10"
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{job.title}</p>
                <div className="flex items-center gap-1 mt-1"><Building2 className="h-3 w-3 text-zinc-500" /><p className="text-xs text-zinc-400 truncate">{job.company}</p></div>
              </div>
              {linkHref ? (
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-blue-400 shrink-0 p-1 -m-1 rounded hover:bg-zinc-800/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">{job.source}</Badge>
              <span className="text-[10px] text-zinc-500">{date}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}

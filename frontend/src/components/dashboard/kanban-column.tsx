"use client";
import { Job } from "@/types";
import { Droppable } from "@hello-pangea/dnd";
import { JobCard } from "./job-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  jobs: Job[];
  onRemoveJob?: (jobId: string) => void | Promise<void>;
}

export function KanbanColumn({ id, label, color, jobs, onRemoveJob }: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-h-[min(420px,55vh)]">
      <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        <Badge variant="secondary" className="ml-auto bg-zinc-800 text-zinc-400 text-xs">{jobs.length}</Badge>
      </div>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col rounded-lg p-2 gap-2 min-h-[280px] transition-colors duration-150",
              snapshot.isDraggingOver
                ? "bg-zinc-800/60 ring-1 ring-zinc-600/50"
                : "bg-zinc-900/40"
            )}
          >
            {jobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                index={index}
                onRemove={onRemoveJob ? () => onRemoveJob(job.id) : undefined}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

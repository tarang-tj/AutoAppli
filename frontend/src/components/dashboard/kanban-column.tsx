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
  /** When true, cards cannot be dragged (e.g. board search is on — DnD indices must match full columns). */
  dragDisabled?: boolean;
  onRemoveJob?: (jobId: string) => void | Promise<void>;
  onSaveNotes?: (jobId: string, notes: string) => void | Promise<void>;
}

export function KanbanColumn({
  id,
  label,
  color,
  jobs,
  dragDisabled = false,
  onRemoveJob,
  onSaveNotes,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-h-[min(420px,55vh)]">
      <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-sm font-semibold text-zinc-100">{label}</span>
        <Badge
          variant="secondary"
          className="ml-auto border border-zinc-600 bg-zinc-800 text-zinc-100 text-xs font-semibold tabular-nums"
        >
          {jobs.length}
        </Badge>
      </div>
      <Droppable droppableId={id} isDropDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex flex-1 flex-col rounded-lg p-2 gap-2 min-h-[280px] transition-colors duration-150",
              snapshot.isDraggingOver
                ? "bg-zinc-800/80 ring-2 ring-blue-500/40"
                : "bg-zinc-900/70 ring-1 ring-zinc-800/80"
            )}
          >
            {jobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                index={index}
                dragDisabled={dragDisabled}
                onRemove={onRemoveJob ? () => onRemoveJob(job.id) : undefined}
                onSaveNotes={
                  onSaveNotes ? (notes) => onSaveNotes(job.id, notes) : undefined
                }
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

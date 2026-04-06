"use client";
import { Job } from "@/types";
import { Droppable } from "@hello-pangea/dnd";
import { JobCard } from "./job-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps { id: string; label: string; color: string; jobs: Job[]; }

export function KanbanColumn({ id, label, color, jobs }: KanbanColumnProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-sm font-medium text-zinc-300">{label}</span>
        <Badge variant="secondary" className="ml-auto bg-zinc-800 text-zinc-400 text-xs">{jobs.length}</Badge>
      </div>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={cn("flex-1 rounded-lg p-2 space-y-2 min-h-[200px] transition-colors", snapshot.isDraggingOver ? "bg-zinc-800/50" : "bg-zinc-900/30")}>
            {jobs.map((job, index) => (<JobCard key={job.id} job={job} index={index} />))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

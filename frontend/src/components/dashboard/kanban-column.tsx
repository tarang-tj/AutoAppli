"use client";
import { Job, MatchScore } from "@/types";
import { Droppable } from "@hello-pangea/dnd";
import { JobCard } from "./job-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  jobs: Job[];
  matchScores?: Record<string, MatchScore>;
  onRemoveJob?: (jobId: string) => void | Promise<void>;
  onSaveNotes?: (jobId: string, notes: string) => void | Promise<void>;
  selectedIds?: Set<string>;
  onToggleSelect?: (jobId: string) => void;
}

export function KanbanColumn({
  id,
  label,
  color,
  jobs,
  matchScores,
  onRemoveJob,
  onSaveNotes,
  selectedIds,
  onToggleSelect,
}: KanbanColumnProps) {
  const hasSelection = selectedIds && selectedIds.size > 0;
  const allSelected = hasSelection && jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id));

  return (
    <div className="flex flex-col flex-1 min-h-[min(420px,55vh)]">
      <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-sm font-semibold text-zinc-100">{label}</span>
        {onToggleSelect && jobs.length > 0 && (
          <button
            type="button"
            title={allSelected ? "Deselect all in column" : "Select all in column"}
            className={cn(
              "ml-1 h-4 w-4 rounded border transition-colors flex items-center justify-center",
              allSelected
                ? "bg-blue-600 border-blue-500"
                : "border-zinc-600 hover:border-zinc-400"
            )}
            onClick={() => {
              if (allSelected) {
                jobs.forEach((j) => {
                  if (selectedIds?.has(j.id)) onToggleSelect(j.id);
                });
              } else {
                jobs.forEach((j) => {
                  if (!selectedIds?.has(j.id)) onToggleSelect(j.id);
                });
              }
            }}
          >
            {allSelected && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
        <Badge
          variant="secondary"
          className="ml-auto border border-zinc-600 bg-zinc-800 text-zinc-100 text-xs font-semibold tabular-nums"
        >
          {jobs.length}
        </Badge>
      </div>
      <Droppable droppableId={id}>
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
                matchScore={matchScores?.[job.id]}
                onRemove={onRemoveJob ? () => onRemoveJob(job.id) : undefined}
                onSaveNotes={
                  onSaveNotes ? (notes) => onSaveNotes(job.id, notes) : undefined
                }
                isSelected={selectedIds?.has(job.id) ?? false}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(job.id) : undefined}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

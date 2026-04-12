"use client";
import { useJobs } from "@/hooks/use-jobs";
import { filterJobsByQuery } from "@/lib/filter-jobs";
import { Job, JobStatus } from "@/types";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useMemo } from "react";
import { KanbanColumn } from "./kanban-column";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: "bookmarked", label: "Bookmarked", color: "bg-zinc-500" },
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "interviewing", label: "Interviewing", color: "bg-yellow-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
  { id: "ghosted", label: "Ghosted", color: "bg-zinc-600" },
];

export function KanbanBoard({ searchQuery = "" }: { searchQuery?: string }) {
  const filterActive = Boolean(searchQuery.trim());
  const {
    jobs,
    isLoading,
    mutate,
    updateJobStatus,
    reorderJobsInColumn,
    persistColumnOrder,
    deleteJob,
    patchJob,
  } = useJobs();

  const visibleJobs = useMemo(
    () => filterJobsByQuery(jobs, searchQuery),
    [jobs, searchQuery]
  );

  const handleSaveNotes = async (jobId: string, notes: string) => {
    try {
      await patchJob(jobId, { notes });
      toast.success("Notes saved");
    } catch {
      toast.error("Could not save notes.");
    }
  };

  const handleRemoveJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      toast.success("Removed from tracker");
    } catch {
      toast.error("Could not remove job.");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (filterActive) return;
    const { source, destination } = result;
    const newStatus = destination.droppableId as JobStatus;
    const jobId = result.draggableId;

    if (source.droppableId === destination.droppableId) {
      if (source.index !== destination.index) {
    try {
          await reorderJobsInColumn(newStatus, source.index, destination.index);
        } catch {
          void mutate();
          toast.error("Could not save card order.");
        }
      }
      return;
    }

    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    const sourceStatus = source.droppableId as JobStatus;
    const sourceIds = jobs
      .filter((j) => j.status === sourceStatus && j.id !== jobId)
      .map((j) => j.id);
    const destIds = jobs
      .filter((j) => j.status === newStatus && j.id !== jobId)
      .map((j) => j.id);
    destIds.splice(destination.index, 0, jobId);

    try {
      await updateJobStatus(jobId, newStatus);
      await persistColumnOrder(newStatus, destIds);
      if (sourceIds.length > 0) {
        await persistColumnOrder(sourceStatus, sourceIds);
      }
    } catch {
      await mutate();
      toast.error("Could not update job status. Try again.");
    }
  };
  const getJobsByStatus = (status: JobStatus): Job[] =>
    visibleJobs.filter((j) => j.status === status);

  const knownIds = new Set<string>(COLUMNS.map((c) => c.id));

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 min-h-[65vh] overflow-x-auto">
        {COLUMNS.map((col) => (
          <div key={col.id} className="min-w-[min(100%,18rem)] flex-1 space-y-3 flex flex-col">
            <Skeleton className="h-8 w-full bg-zinc-800 shrink-0" />
            <Skeleton className="h-28 w-full bg-zinc-800" />
            <Skeleton className="h-28 w-full bg-zinc-800 flex-1 min-h-[200px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {filterActive ? (
        <p className="text-xs text-amber-200/90 mb-3 px-1" role="note">
          Board filter is on — clear it to drag cards between columns (search hides rows and breaks drop
          positions).
        </p>
      ) : null}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[65vh] items-stretch overflow-x-auto pb-1 -mx-1 px-1">
        {COLUMNS.map((col) => {
          const colJobs =
            col.id === "bookmarked"
              ? visibleJobs.filter(
                  (j) => j.status === "bookmarked" || !knownIds.has(j.status)
                )
              : getJobsByStatus(col.id);
          return (
            <div
              key={col.id}
              className="min-w-[min(100%,18rem)] flex-1 lg:min-w-[11.5rem] flex flex-col"
            >
              <KanbanColumn
                id={col.id}
                label={col.label}
                color={col.color}
                jobs={colJobs}
                dragDisabled={filterActive}
                onRemoveJob={handleRemoveJob}
                onSaveNotes={handleSaveNotes}
              />
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

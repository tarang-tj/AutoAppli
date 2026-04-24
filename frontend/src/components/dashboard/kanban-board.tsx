"use client";
import { useJobs } from "@/hooks/use-jobs";
import { useMatchScores } from "@/hooks/use-match-scores";
import { filterJobsByQuery } from "@/lib/filter-jobs";
import { ClosedReason, Job, JobStatus } from "@/types";
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

interface KanbanBoardProps {
  searchQuery?: string;
  /** When true, archived jobs are shown (otherwise filtered out). */
  showArchived?: boolean;
}

export function KanbanBoard({
  searchQuery = "",
  showArchived = false,
}: KanbanBoardProps) {
  const {
    jobs,
    isLoading,
    updateJobStatus,
    reorderJobsInColumn,
    persistColumnOrder,
    deleteJob,
    patchJob,
    closeOutJob,
    archiveJob,
  } = useJobs();

  const { scores: matchScores } = useMatchScores();

  const visibleJobs = useMemo(() => {
    const queried = filterJobsByQuery(jobs, searchQuery);
    return showArchived ? queried : queried.filter((j) => !j.archived);
  }, [jobs, searchQuery, showArchived]);

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

  const handleCloseOut = async (jobId: string, reason: ClosedReason | null) => {
    try {
      await closeOutJob(jobId, reason);
      if (reason) {
        toast.success("Closed out");
      } else {
        toast.success("Re-opened");
      }
    } catch {
      toast.error("Could not update close-out.");
    }
  };

  const handleArchive = async (jobId: string, archived: boolean) => {
    try {
      await archiveJob(jobId, archived);
      toast.success(archived ? "Archived" : "Restored to board");
    } catch {
      toast.error("Could not update archive state.");
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const newStatus = destination.droppableId as JobStatus;
    const jobId = result.draggableId;

    if (source.droppableId === destination.droppableId) {
      if (source.index !== destination.index) {
        try {
          await reorderJobsInColumn(newStatus, source.index, destination.index);
        } catch {
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
      <div
        className="flex flex-col lg:flex-row gap-4 min-h-[65vh] items-stretch overflow-x-auto pb-1 -mx-1 px-1 lg:snap-none snap-x snap-mandatory scroll-smooth"
        role="list"
        aria-label="Job pipeline — drag cards between columns"
      >
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
              className="min-w-[min(100%,18rem)] flex-1 lg:min-w-[11.5rem] flex flex-col snap-start lg:snap-align-none"
              role="listitem"
              aria-label={`${col.label} — ${colJobs.length} jobs`}
            >
              <KanbanColumn
                id={col.id}
                label={col.label}
                color={col.color}
                jobs={colJobs}
                matchScores={matchScores}
                onRemoveJob={handleRemoveJob}
                onSaveNotes={handleSaveNotes}
                onCloseOut={handleCloseOut}
                onArchive={handleArchive}
              />
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

"use client";
import { useJobs } from "@/hooks/use-jobs";
import { Job, JobStatus } from "@/types";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: "bookmarked", label: "Bookmarked", color: "bg-zinc-500" },
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "interviewing", label: "Interviewing", color: "bg-yellow-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
];

export function KanbanBoard() {
  const { jobs, isLoading, updateJobStatus, reorderJobsInColumn } = useJobs();
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const newStatus = destination.droppableId as JobStatus;
    const jobId = result.draggableId;

    if (source.droppableId === destination.droppableId) {
      if (source.index !== destination.index) {
        reorderJobsInColumn(newStatus, source.index, destination.index);
      }
      return;
    }

    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;
    try {
      await updateJobStatus(jobId, newStatus);
    } catch {
      toast.error("Could not update job status. Try again.");
    }
  };
  const getJobsByStatus = (status: JobStatus): Job[] => jobs.filter((j) => j.status === status);

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
      <div className="flex flex-col lg:flex-row gap-4 min-h-[65vh] items-stretch overflow-x-auto pb-1 -mx-1 px-1">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="min-w-[min(100%,18rem)] flex-1 lg:min-w-[11.5rem] flex flex-col"
          >
            <KanbanColumn id={col.id} label={col.label} color={col.color} jobs={getJobsByStatus(col.id)} />
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

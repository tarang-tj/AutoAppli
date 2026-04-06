"use client";
import { useJobs } from "@/hooks/use-jobs";
import { Job, JobStatus } from "@/types";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS: { id: JobStatus; label: string; color: string }[] = [
  { id: "bookmarked", label: "Bookmarked", color: "bg-zinc-500" },
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "interviewing", label: "Interviewing", color: "bg-yellow-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
];

export function KanbanBoard() {
  const { jobs, isLoading, updateJobStatus } = useJobs();
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as JobStatus;
    const jobId = result.draggableId;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;
    await updateJobStatus(jobId, newStatus);
  };
  const getJobsByStatus = (status: JobStatus): Job[] => jobs.filter((j) => j.status === status);

  if (isLoading) {
    return (<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {COLUMNS.map((col) => (<div key={col.id} className="space-y-3"><Skeleton className="h-8 w-full bg-zinc-800" /><Skeleton className="h-24 w-full bg-zinc-800" /><Skeleton className="h-24 w-full bg-zinc-800" /></div>))}
    </div>);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[60vh]">
        {COLUMNS.map((col) => (<KanbanColumn key={col.id} id={col.id} label={col.label} color={col.color} jobs={getJobsByStatus(col.id)} />))}
      </div>
    </DragDropContext>
  );
}

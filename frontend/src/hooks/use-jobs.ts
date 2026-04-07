"use client";
import { apiGet, apiPatch, isJobsApiConfigured } from "@/lib/api";
import { getDemoJobs, setDemoJobs } from "@/lib/demo-data";
import { reorderJobsWithinStatus } from "@/lib/kanban-reorder";
import type { Job, JobStatus } from "@/types";
import useSWR from "swr";

export function useJobs(status?: string) {
  const path = status ? `/jobs?status=${status}` : "/jobs";
  const useBackend = isJobsApiConfigured();

  const { data, error, isLoading, mutate } = useSWR<Job[]>(
    path,
    () => apiGet<Job[]>(path),
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    if (!useBackend) {
      await apiPatch(`/jobs/${jobId}`, { status: newStatus });
      await mutate();
      return;
    }

    await mutate(
      async (current) => {
        await apiPatch(`/jobs/${jobId}`, { status: newStatus });
        const list = current ?? [];
        const now = new Date().toISOString();
        return list.map((j) =>
          j.id === jobId ? { ...j, status: newStatus as JobStatus, updated_at: now } : j
        );
      },
      {
        optimisticData: (current) => {
          const list = current ?? [];
          const now = new Date().toISOString();
          return list.map((j) =>
            j.id === jobId ? { ...j, status: newStatus as JobStatus, updated_at: now } : j
          );
        },
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
  };

  const reorderJobsInColumn = (columnStatus: JobStatus, fromIndex: number, toIndex: number) => {
    if (!useBackend) {
      const next = reorderJobsWithinStatus(getDemoJobs(), columnStatus, fromIndex, toIndex);
      setDemoJobs(next);
      void mutate();
      return;
    }
    void mutate(
      (current) => reorderJobsWithinStatus(current ?? [], columnStatus, fromIndex, toIndex),
      { revalidate: false }
    );
  };

  return { jobs: data || [], error, isLoading, mutate, updateJobStatus, reorderJobsInColumn };
}

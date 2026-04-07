"use client";
import { apiDelete, apiGet, apiPatch, apiPut, isJobsApiConfigured } from "@/lib/api";
import { getDemoJobs } from "@/lib/demo-data";
import { reorderJobsWithinStatus, sortJobsKanbanOrder } from "@/lib/kanban-reorder";
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

  const jobs = sortJobsKanbanOrder(data || []);

  const persistColumnOrder = async (
    columnStatus: JobStatus,
    orderedIds: string[]
  ) => {
    if (orderedIds.length === 0) return;
    await apiPut("/jobs/reorder", {
      status: columnStatus,
      ordered_ids: orderedIds,
    });
    if (!useBackend) {
      await mutate();
      return;
    }
    await mutate(
      (prev) => {
        if (!prev) return prev;
        const m = new Map(orderedIds.map((id, i) => [id, i]));
        const now = new Date().toISOString();
        const next = prev.map((j) =>
          m.has(j.id)
            ? { ...j, sort_order: m.get(j.id)!, updated_at: now }
            : j
        );
        return sortJobsKanbanOrder(next);
      },
      { revalidate: false }
    );
  };

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
        const others = list.filter(
          (j) => j.id !== jobId && j.status === newStatus
        );
        const maxOrd = others.length
          ? Math.max(...others.map((j) => j.sort_order ?? 0))
          : -1;
        return sortJobsKanbanOrder(
          list.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: newStatus as JobStatus,
                  sort_order: maxOrd + 1,
                  updated_at: now,
                }
              : j
          )
        );
      },
      {
        optimisticData: (current) => {
          const list = current ?? [];
          const now = new Date().toISOString();
          const others = list.filter(
            (j) => j.id !== jobId && j.status === newStatus
          );
          const maxOrd = others.length
            ? Math.max(...others.map((j) => j.sort_order ?? 0))
            : -1;
          return sortJobsKanbanOrder(
            list.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: newStatus as JobStatus,
                    sort_order: maxOrd + 1,
                    updated_at: now,
                  }
                : j
            )
          );
        },
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
  };

  const reorderJobsInColumn = async (
    columnStatus: JobStatus,
    fromIndex: number,
    toIndex: number
  ) => {
    const base = useBackend ? (data ?? []) : getDemoJobs();
    const next = reorderJobsWithinStatus(
      base,
      columnStatus,
      fromIndex,
      toIndex
    );
    const orderedIds = next
      .filter((j) => j.status === columnStatus)
      .map((j) => j.id);
    const withOrders = next.map((j) => {
      const idx = orderedIds.indexOf(j.id);
      return j.status === columnStatus && idx >= 0
        ? { ...j, sort_order: idx }
        : j;
    });
    const sorted = sortJobsKanbanOrder(withOrders);

    if (!useBackend) {
      await apiPut("/jobs/reorder", {
        status: columnStatus,
        ordered_ids: orderedIds,
      });
      await mutate();
      return;
    }

    await mutate(
      async () => {
        await apiPut("/jobs/reorder", {
          status: columnStatus,
          ordered_ids: orderedIds,
        });
        return sorted;
      },
      {
        optimisticData: sorted,
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
  };

  const deleteJob = async (jobId: string) => {
    await apiDelete(`/jobs/${jobId}`);
    await mutate();
  };

  const patchJob = async (
    jobId: string,
    patch: { status?: JobStatus; notes?: string | null }
  ) => {
    const updated = await apiPatch<Job>(`/jobs/${jobId}`, patch);
    await mutate(
      (c) =>
        sortJobsKanbanOrder((c ?? []).map((j) => (j.id === jobId ? updated : j))),
      { revalidate: false }
    );
  };

  return {
    jobs,
    error,
    isLoading,
    mutate,
    updateJobStatus,
    reorderJobsInColumn,
    persistColumnOrder,
    deleteJob,
    patchJob,
  };
}

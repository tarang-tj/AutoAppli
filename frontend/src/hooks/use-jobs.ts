"use client";
import { apiGet, apiPatch } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoJobs, setDemoJobs } from "@/lib/demo-data";
import { reorderJobsWithinStatus } from "@/lib/kanban-reorder";
import type { Job, JobStatus } from "@/types";
import useSWR from "swr";
import { useState } from "react";

export function useJobs(status?: string) {
  const path = status ? `/jobs?status=${status}` : "/jobs";
  const [demoMode] = useState(!isSupabaseConfigured());

  const { data, error, isLoading, mutate } = useSWR<Job[]>(
    path,
    () => {
      if (demoMode) {
        const jobs = getDemoJobs();
        return status ? jobs.filter((j) => j.status === status) : jobs;
      }
      return apiGet<Job[]>(path);
    },
    { revalidateOnFocus: false, dedupingInterval: 0 }
  );

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    if (demoMode) {
      const jobs = getDemoJobs();
      const jobIndex = jobs.findIndex((j) => j.id === jobId);
      if (jobIndex !== -1) {
        jobs[jobIndex] = {
          ...jobs[jobIndex],
          status: newStatus as JobStatus,
          updated_at: new Date().toISOString(),
        };
        setDemoJobs(jobs);
        mutate();
      }
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

  const reorderJobsInColumn = (status: JobStatus, fromIndex: number, toIndex: number) => {
    if (demoMode) {
      const next = reorderJobsWithinStatus(getDemoJobs(), status, fromIndex, toIndex);
      setDemoJobs(next);
      void mutate();
      return;
    }
    void mutate(
      (current) => reorderJobsWithinStatus(current ?? [], status, fromIndex, toIndex),
      { revalidate: false }
    );
  };

  return { jobs: data || [], error, isLoading, mutate, updateJobStatus, reorderJobsInColumn };
}

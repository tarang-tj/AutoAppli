"use client";
import { apiGet, apiPatch } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoJobs, setDemoJobs } from "@/lib/demo-data";
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
    } else {
      await apiPatch(`/jobs/${jobId}`, { status: newStatus });
      mutate();
    }
  };

  return { jobs: data || [], error, isLoading, mutate, updateJobStatus };
}

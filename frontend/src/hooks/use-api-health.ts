"use client";

import { checkApiHealth, isJobsApiConfigured } from "@/lib/api";
import { useEffect, useState } from "react";

export type ApiHealthState = "idle" | "checking" | "ok" | "error";

/**
 * Polls the FastAPI `/health` endpoint when `NEXT_PUBLIC_API_URL` is set.
 */
export function useApiHealth(): ApiHealthState {
  const [state, setState] = useState<ApiHealthState>(() =>
    isJobsApiConfigured() ? "checking" : "idle"
  );

  useEffect(() => {
    if (!isJobsApiConfigured()) {
      setState("idle");
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState("checking");
      const ok = await checkApiHealth();
      if (!cancelled) setState(ok ? "ok" : "error");
    };

    void run();
    const id = window.setInterval(run, 60_000);
    const onFocus = () => void run();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return state;
}

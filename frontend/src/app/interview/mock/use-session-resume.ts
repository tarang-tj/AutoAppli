/**
 * useSessionResume — reads ?session=<id> from the URL on mount and
 * hydrates MockInterviewUI state from the /resume endpoint.
 *
 * Returns the initial hydrated state (or null while loading / on error)
 * plus a loading flag so the parent can show a transitional state.
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resumeSession, type ResumeResponse } from "@/lib/mock-interview/api";

export type ResumeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: ResumeResponse }
  | { status: "error"; message: string };

export function useSessionResume(): ResumeState {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [state, setState] = useState<ResumeState>(
    sessionParam ? { status: "loading" } : { status: "idle" },
  );

  useEffect(() => {
    if (!sessionParam) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    resumeSession(sessionParam)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Failed to resume session.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionParam]);

  return state;
}

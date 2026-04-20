"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/supabase/error-log";

/**
 * Pre-Sprint-9 instrumentation — global window-level error capture.
 *
 * Mounted once in the root layout. Attaches two listeners that together
 * cover the major escape hatches:
 *
 *   - `unhandledrejection` — any promise that rejects without a `.catch()`
 *     (by far the most common "invisible" bug class in React + SWR code).
 *   - `error` — uncaught synchronous exceptions (rare, but catches things
 *     like a top-level `throw` in render that somehow bypassed an error
 *     boundary).
 *
 * Errors caught by consumer try/catch blocks (which usually show a toast)
 * are NOT logged here — they're already handled at the UI layer. During
 * user testing, anything that escapes both the consumer catch AND any
 * error boundaries is almost certainly a real bug worth triaging.
 *
 * logClientError is fire-and-forget + never throws, so this listener can't
 * become the new source of errors.
 */
export function GlobalErrorListener() {
  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      logClientError(ev.reason, {
        context: { source: "unhandledrejection" },
      });
    };
    const onError = (ev: ErrorEvent) => {
      logClientError(ev.error ?? ev.message, {
        context: {
          source: "window.onerror",
          filename: ev.filename,
          lineno: ev.lineno,
          colno: ev.colno,
        },
      });
    };

    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}

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
 * In addition to the Supabase fire-and-forget log, we also:
 *   1. `console.error` a structured payload so the same record is grep-able
 *      in Vercel runtime logs / browser devtools without a Supabase
 *      round-trip.
 *   2. Dispatch a `window` `CustomEvent` (`autoappli:error`) so a future
 *      Sentry / PostHog / log-drain integration can subscribe without
 *      having to edit this file. Listener contract is `event.detail` shaped
 *      like the structured payload below.
 *
 * logClientError is fire-and-forget + never throws, so this listener can't
 * become the new source of errors.
 */

/** Shape of the structured payload we log + dispatch. Stable contract for
 *  future error-tracking subscribers — add fields, never remove. */
export interface AutoAppliErrorDetail {
  at: string; // ISO timestamp
  source: "unhandledrejection" | "window.onerror";
  message: string;
  stack: string | null;
  url: string;
  ua: string;
  filename?: string;
  lineno?: number;
  colno?: number;
}

function buildDetail(
  err: unknown,
  source: AutoAppliErrorDetail["source"],
  extras: Pick<AutoAppliErrorDetail, "filename" | "lineno" | "colno"> = {},
): AutoAppliErrorDetail {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : (() => {
            try {
              return String(err);
            } catch {
              return "[unstringifiable error]";
            }
          })();
  const stack = err instanceof Error && err.stack ? err.stack : null;
  return {
    at: new Date().toISOString(),
    source,
    message,
    stack,
    url:
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "",
    ua:
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, 500)
        : "",
    ...extras,
  };
}

function emit(detail: AutoAppliErrorDetail): void {
  // 1. Structured console line — easy to grep in production logs.
  console.error("[autoappli:error]", detail);
  // 2. Custom event — future Sentry/PostHog hook attaches here.
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("autoappli:error", { detail }),
      );
    } catch {
      // CustomEvent unsupported (very old browsers) — never let this throw.
    }
  }
}

export function GlobalErrorListener() {
  useEffect(() => {
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const detail = buildDetail(ev.reason, "unhandledrejection");
      emit(detail);
      logClientError(ev.reason, {
        context: { source: "unhandledrejection" },
      });
    };
    const onError = (ev: ErrorEvent) => {
      const detail = buildDetail(ev.error ?? ev.message, "window.onerror", {
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
      });
      emit(detail);
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

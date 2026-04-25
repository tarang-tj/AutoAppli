import { Suspense } from "react";
import { MockInterviewUI } from "./mock-interview-ui";

/**
 * /interview/mock — AI Mock Interview page.
 *
 * Wraps MockInterviewUI in Suspense so Next.js can statically prerender
 * the shell without erroring on client-only hooks.
 */
export default function MockInterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto animate-pulse space-y-4 pt-6">
          <div className="h-7 w-48 rounded bg-zinc-800" />
          <div className="h-4 w-72 rounded bg-zinc-800" />
          <div className="h-64 rounded-xl bg-zinc-800" />
        </div>
      }
    >
      <MockInterviewUI />
    </Suspense>
  );
}

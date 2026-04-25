import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { HistoryList } from "./history-list";

/**
 * /interview/mock/history — Mock interview session history.
 *
 * Lists the authenticated user's past sessions with role, date, completion
 * status, and overall score. Each row links back to the session view.
 */
export default function MockInterviewHistoryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/interview/mock"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Back to mock interview"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-500/10 border border-blue-500/20 p-2">
          <History className="h-5 w-5 text-blue-300" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Interview History</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Your recent mock interview sessions
          </p>
        </div>
      </div>

      {/* Session list — suspense boundary so the shell pre-renders */}
      <Suspense
        fallback={
          <div className="space-y-3 animate-pulse" aria-label="Loading sessions">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-zinc-800 border border-zinc-700"
              />
            ))}
          </div>
        }
      >
        <HistoryList />
      </Suspense>
    </div>
  );
}

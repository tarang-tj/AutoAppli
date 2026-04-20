"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logClientError } from "@/lib/supabase/error-log";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Pre-Sprint-9 — ship anything that hit this boundary up to Supabase so
    // we can triage during user testing. Fire-and-forget; never rethrows.
    logClientError(error, {
      context: { source: "error-boundary", digest: error.digest ?? null },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased flex flex-col items-center justify-center px-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-zinc-400 text-sm text-center max-w-md">
          Please try again. If the problem continues, refresh the page or return to the dashboard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button type="button" onClick={() => reset()} className="bg-blue-600 hover:bg-blue-700">
            Try again
          </Button>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-zinc-700 text-white hover:bg-zinc-800"
            )}
          >
            Dashboard
          </Link>
        </div>
      </body>
    </html>
  );
}

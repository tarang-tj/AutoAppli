"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-white antialiased flex flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-red-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-zinc-400 text-sm max-w-md">
          Please try again. If the problem continues, refresh the page or return to the dashboard.
        </p>
        {error?.digest && (
          <p className="mt-3 text-[11px] font-mono text-zinc-600 tabular-nums">
            Error ID: {error.digest}
          </p>
        )}
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

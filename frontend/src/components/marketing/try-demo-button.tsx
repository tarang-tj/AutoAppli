"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { enableDemoMode } from "@/lib/demo-mode";
import { PlayCircle } from "lucide-react";

/**
 * "Try demo" button — sets the demo-mode flag and navigates to /dashboard.
 *
 * Lives under /marketing/ because it's part of the pre-signup funnel: a
 * visitor who wants to kick the tires without creating an account. After
 * the click, everything on /dashboard reads from demo-data.ts via the
 * isDemoMode() gates in api.ts.
 */
export function TryDemoButton({
  variant = "outline",
  className = "",
  children,
}: {
  variant?: "primary" | "outline";
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = useCallback(() => {
    setPending(true);
    enableDemoMode();
    router.push("/dashboard");
  }, [router]);

  const base =
    "inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-all";
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
      : "border border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:border-zinc-600";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`${base} ${styles} disabled:opacity-60 ${className}`}
    >
      <PlayCircle className="h-4 w-4" />
      {children ?? (pending ? "Loading demo…" : "Try the demo")}
    </button>
  );
}

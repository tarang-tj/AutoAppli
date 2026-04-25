"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CYCLE: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

// useSyncExternalStore with a noop subscriber returns `false` on the server
// snapshot and `true` after hydration — same SSR-safe mount detection as the
// old `useEffect(() => setMounted(true), [])` pattern, but without the
// set-state-in-effect lint violation.
const subscribeMount = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

/**
 * Cycles through light → dark → system.
 * Renders a neutral placeholder on the server so SSR markup matches before
 * next-themes mounts.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeMount,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("opacity-0", className)}
        aria-hidden="true"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const current = (theme as "light" | "dark" | "system") ?? "system";
  const Icon =
    current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Theme: ${current}. Click to switch to ${next}.`}
      title={`Theme: ${current} → ${next}`}
      onClick={() => setTheme(next)}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

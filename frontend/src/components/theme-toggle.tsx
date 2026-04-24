"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CYCLE: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

/**
 * Cycles through light → dark → system.
 * Renders a neutral placeholder on the server so SSR markup matches before
 * next-themes mounts.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

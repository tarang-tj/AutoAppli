"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["⌘", "K"], description: "Open command palette", category: "Navigation" },
  { keys: ["N"], description: "Quick-add new job (from dashboard)", category: "Actions" },
  { keys: ["G", "D"], description: "Go to Dashboard", category: "Navigation" },
  { keys: ["G", "J"], description: "Go to Job Search", category: "Navigation" },
  { keys: ["G", "R"], description: "Go to Resume Builder", category: "Navigation" },
  { keys: ["G", "C"], description: "Go to Cover Letter", category: "Navigation" },
  { keys: ["G", "O"], description: "Go to Outreach", category: "Navigation" },
  { keys: ["G", "A"], description: "Go to Analytics", category: "Navigation" },
  { keys: ["G", "S"], description: "Go to Settings", category: "Navigation" },
  { keys: ["?"], description: "Show keyboard shortcuts", category: "Help" },
  { keys: ["Esc"], description: "Close dialogs and overlays", category: "Help" },
];

const GO_ROUTES: Record<string, string> = {
  d: "/dashboard",
  j: "/jobs",
  r: "/resume",
  c: "/cover-letter",
  o: "/outreach",
  a: "/analytics",
  s: "/settings",
  i: "/interviews",
  t: "/timeline",
  n: "/notifications",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [goPrefix, setGoPrefix] = useState(false);

  const isInputFocused = useCallback(() => {
    const tag = document.activeElement?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
           document.activeElement?.getAttribute("contenteditable") === "true";
  }, []);

  useEffect(() => {
    let goTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (isInputFocused()) return;
      // Don't trigger on modifier combos (except Cmd+K which is handled by command-palette)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? = show help
      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape = close help
      if (e.key === "Escape") {
        setShowHelp(false);
        return;
      }

      // G prefix for navigation
      if (e.key === "g" && !goPrefix) {
        setGoPrefix(true);
        goTimer = setTimeout(() => setGoPrefix(false), 1500);
        return;
      }

      if (goPrefix) {
        setGoPrefix(false);
        clearTimeout(goTimer);
        const route = GO_ROUTES[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(goTimer);
    };
  }, [goPrefix, isInputFocused, router]);

  if (!showHelp) return null;

  const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                {cat}
              </h3>
              <div className="space-y-1.5">
                {SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                  <div key={s.description} className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-300">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-zinc-600 text-xs mx-0.5">then</span>}
                          <kbd className="inline-flex items-center justify-center min-w-[24px] rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 text-[11px] font-mono text-zinc-400">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-zinc-800 text-[10px] text-zinc-600 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">?</kbd> to toggle this overlay
        </div>
      </div>
    </div>
  );
}

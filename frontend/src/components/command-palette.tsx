"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Command as CommandIcon,
  FileText,
  Layout,
  Mail,
  Moon,
  Palette,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  Users,
  Wand2,
  Workflow,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Command Palette — Cmd/Ctrl-K navigator + quick actions.
 *
 * Design notes:
 *   - No runtime dependency (no `cmdk`) so we don't bloat the bundle.
 *   - Pure substring + starts-with scoring: simple, deterministic, fast.
 *   - Scrolls the active item into view; wraps at boundaries.
 *   - Escape closes; Enter selects; Up/Down navigates.
 *   - Renders a one-shot portal — the dialog is unmounted when closed
 *     so it has no idle cost on the dashboard.
 */

type CommandAction = {
  id: string;
  label: string;
  group: string;
  keywords?: string[];
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  run: () => void;
};

function useCommandActions(opts: {
  close: () => void;
  setTheme: (t: string) => void;
  push: (href: string) => void;
}): CommandAction[] {
  const { close, setTheme, push } = opts;
  return useMemo<CommandAction[]>(() => {
    const navigate = (href: string) => () => {
      push(href);
      close();
    };
    return [
      // ── Navigate ────────────────────────────────────────────
      { id: "nav-dashboard", label: "Dashboard", group: "Navigate", icon: Layout, keywords: ["home", "kanban", "board"], run: navigate("/dashboard") },
      { id: "nav-jobs", label: "Search Jobs", group: "Navigate", icon: Search, keywords: ["find", "search"], run: navigate("/jobs") },
      { id: "nav-discover", label: "Discover / Recommended", group: "Navigate", icon: Sparkles, keywords: ["match", "fit", "recommended"], run: navigate("/discover") },
      { id: "nav-resume", label: "Resume Builder", group: "Navigate", icon: FileText, keywords: ["cv", "tailor"], run: navigate("/resume") },
      { id: "nav-resume-templates", label: "Resume Templates", group: "Navigate", icon: FileText, run: navigate("/resume-templates") },
      { id: "nav-cover", label: "Cover Letters", group: "Navigate", icon: Mail, run: navigate("/cover-letter") },
      { id: "nav-outreach", label: "Outreach / Cold Email", group: "Navigate", icon: Send, run: navigate("/outreach") },
      { id: "nav-interviews", label: "Interview Prep", group: "Navigate", icon: Briefcase, run: navigate("/interviews") },
      { id: "nav-contacts", label: "Contacts CRM", group: "Navigate", icon: Users, run: navigate("/contacts") },
      { id: "nav-timeline", label: "Timeline", group: "Navigate", icon: Calendar, run: navigate("/timeline") },
      { id: "nav-analytics", label: "Analytics", group: "Navigate", icon: BarChart3, run: navigate("/analytics") },
      { id: "nav-automation", label: "Automation Rules", group: "Navigate", icon: Workflow, run: navigate("/automation") },
      { id: "nav-salary", label: "Salary Tracker", group: "Navigate", icon: Target, run: navigate("/salary") },
      { id: "nav-templates", label: "Templates", group: "Navigate", icon: FileText, run: navigate("/templates") },
      { id: "nav-notifications", label: "Notifications", group: "Navigate", icon: Bell, run: navigate("/notifications") },
      { id: "nav-settings", label: "Settings", group: "Navigate", icon: Settings, run: navigate("/settings") },
      { id: "nav-export", label: "Export", group: "Navigate", icon: FileText, run: navigate("/export") },

      // ── Actions ─────────────────────────────────────────────
      {
        id: "act-add-job",
        label: "Add Job",
        group: "Actions",
        icon: Wand2,
        keywords: ["new", "bookmark"],
        shortcut: "go",
        run: navigate("/dashboard?add=1"),
      },
      {
        id: "act-tailor",
        label: "Tailor Resume to a Job",
        group: "Actions",
        icon: Wand2,
        keywords: ["rewrite", "ai", "claude"],
        run: navigate("/resume"),
      },
      {
        id: "act-practice",
        label: "Practice an Interview",
        group: "Actions",
        icon: Briefcase,
        keywords: ["mock", "simulate"],
        run: navigate("/interviews?practice=1"),
      },

      // ── Theme ───────────────────────────────────────────────
      { id: "theme-light", label: "Switch to Light Mode", group: "Theme", icon: Sun, keywords: ["bright"], run: () => { setTheme("light"); close(); } },
      { id: "theme-dark", label: "Switch to Dark Mode", group: "Theme", icon: Moon, keywords: ["night"], run: () => { setTheme("dark"); close(); } },
      { id: "theme-system", label: "Use System Theme", group: "Theme", icon: Palette, keywords: ["auto"], run: () => { setTheme("system"); close(); } },
    ];
  }, [close, push, setTheme]);
}

function score(action: CommandAction, q: string): number {
  if (!q) return 1; // show everything when empty
  const hay = [action.label, action.group, ...(action.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  const needle = q.toLowerCase().trim();
  if (!needle) return 1;
  if (hay.includes(needle)) {
    // Weight: startsWith > wordBoundary > substring.
    if (action.label.toLowerCase().startsWith(needle)) return 4;
    if (hay.split(/\s+/).some((w) => w.startsWith(needle))) return 3;
    return 2;
  }
  // Subsequence fallback — "db" matches "Dashboard" (d...b).
  let i = 0;
  for (const c of hay) {
    if (c === needle[i]) i++;
    if (i === needle.length) return 1;
  }
  return 0;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const { setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  const actions = useCommandActions({
    close,
    setTheme: (t) => setTheme(t),
    push: (href) => router.push(href),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus input next tick — the dialog mount needs to finish.
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const scored = actions
      .map((a) => ({ action: a, score: score(a, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((x) => x.action);
  }, [actions, q]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  // Build group boundaries for display
  const groups: Array<{ group: string; items: CommandAction[] }> = [];
  for (const a of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.group === a.group) last.items.push(a);
    else groups.push({ group: a.group, items: [a] });
  }

  let globalIdx = 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
      onClick={close}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-xl",
          "bg-popover text-popover-foreground ring-1 ring-foreground/10",
          "shadow-2xl"
        )}
      >
        <div className="flex items-center gap-2 border-b border-foreground/10 px-3">
          <CommandIcon className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-1"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for &ldquo;{q}&rdquo;.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.group}>
                <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </div>
                {g.items.map((a) => {
                  const idx = globalIdx++;
                  const Icon = a.icon;
                  const isActive = idx === active;
                  return (
                    <button
                      type="button"
                      key={a.id}
                      data-idx={idx}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => a.run()}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                        "outline-none transition-colors",
                        isActive
                          ? "bg-foreground/10 text-foreground"
                          : "text-foreground/80 hover:bg-foreground/5"
                      )}
                    >
                      {Icon ? (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-foreground/10 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-foreground/10 px-1 py-0.5">↑↓</kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="rounded bg-foreground/10 px-1 py-0.5">↵</kbd>{" "}
              select
            </span>
          </div>
          <span>
            <kbd className="rounded bg-foreground/10 px-1 py-0.5">⌘K</kbd> to
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}

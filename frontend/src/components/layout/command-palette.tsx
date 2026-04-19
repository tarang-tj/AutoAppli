"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  Briefcase,
  CalendarCheck,
  Clock,
  CornerDownLeft,
  DollarSign,
  Download,
  FileDown,
  FileStack,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  PenTool,
  PlayCircle,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { disableDemoMode, enableDemoMode, isDemoMode } from "@/lib/demo-mode";

/**
 * CommandPalette — global ⌘K / Ctrl+K modal.
 *
 * Why hand-rolled (no cmdk/shadcn Command dependency):
 * - Keeps our footprint small; only lucide-react is needed.
 * - Lets us mix navigation entries with imperative actions (toggle demo,
 *   sign out, open bookmarklet) without forcing every action through a
 *   Link component.
 * - Identifying-string matching is good enough at our list size (~30
 *   entries); a full fuzzy matcher would be overkill.
 *
 * Keyboard contract:
 *   ⌘K / Ctrl+K   open or close
 *   ↑/↓           move highlight
 *   Enter         run highlighted command
 *   Esc           close
 */

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  group: "Navigate" | "Actions" | "AI" | "Account";
  /** Either href OR run; href wins if both are set. */
  href?: string;
  run?: () => void | Promise<void>;
  keywords?: string[];
};

const STATIC_COMMANDS: Omit<Command, "run">[] = [
  // Navigate
  { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, group: "Navigate", href: "/dashboard", keywords: ["home", "kanban", "board", "tracker"] },
  { id: "nav-jobs", label: "Search Jobs", icon: Search, group: "Navigate", href: "/jobs", keywords: ["find", "discover", "openings"] },
  { id: "nav-resume", label: "Resume Builder", icon: FileText, group: "Navigate", href: "/resume", keywords: ["cv", "upload"] },
  { id: "nav-cover", label: "Cover Letters", icon: PenTool, group: "Navigate", href: "/cover-letter", keywords: ["letter", "draft"] },
  { id: "nav-outreach", label: "Cold Outreach", icon: Send, group: "Navigate", href: "/outreach", keywords: ["email", "recruiter", "message"] },
  { id: "nav-interviews", label: "Interview Prep", icon: CalendarCheck, group: "Navigate", href: "/interviews", keywords: ["practice", "questions"] },
  { id: "nav-practice", label: "Practice Interview Chat", icon: Sparkles, group: "AI", href: "/interviews/practice", keywords: ["mock", "interview", "ai", "rehearse"] },
  { id: "nav-timeline", label: "Activity Timeline", icon: Clock, group: "Navigate", href: "/timeline", keywords: ["history"] },
  { id: "nav-contacts", label: "Contacts", icon: Users, group: "Navigate", href: "/contacts", keywords: ["recruiters", "people"] },
  { id: "nav-salary", label: "Salary Tracker", icon: DollarSign, group: "Navigate", href: "/salary", keywords: ["compensation", "comp", "pay"] },
  { id: "nav-notifications", label: "Notifications", icon: Bell, group: "Navigate", href: "/notifications", keywords: ["alerts", "reminders"] },
  { id: "nav-analytics", label: "Analytics", icon: BarChart3, group: "Navigate", href: "/analytics", keywords: ["stats", "insights", "metrics"] },
  { id: "nav-export", label: "Export Data", icon: FileDown, group: "Navigate", href: "/export", keywords: ["csv", "download", "backup"] },
  { id: "nav-templates", label: "Email Templates", icon: FileStack, group: "Navigate", href: "/templates" },
  { id: "nav-rt", label: "Resume Templates", icon: Download, group: "Navigate", href: "/resume-templates" },
  { id: "nav-automation", label: "Automation", icon: Zap, group: "Navigate", href: "/automation" },
  { id: "nav-settings", label: "Settings", icon: Settings, group: "Account", href: "/settings", keywords: ["profile", "preferences"] },

  // Actions
  { id: "act-add-job", label: "Add Job to Board", icon: Briefcase, group: "Actions", href: "/dashboard?add=1", keywords: ["new", "save", "create", "track"] },
  { id: "act-bookmarklet", label: "Install Bookmarklet", icon: Bookmark, group: "Actions", href: "/bookmarklet", keywords: ["browser", "save", "linkedin", "one-click"] },
  { id: "act-help", label: "Show Keyboard Shortcuts", icon: HelpCircle, group: "Actions", keywords: ["?", "hotkeys", "help"] },
];

function matchScore(cmd: Omit<Command, "run">, q: string): number {
  if (!q) return 1;
  const needle = q.toLowerCase();
  const haystack = [cmd.label, cmd.group, ...(cmd.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(needle)) {
    // Prefer matches at start of label.
    return cmd.label.toLowerCase().startsWith(needle) ? 3 : 2;
  }
  // Subsequence fallback so "rsm" matches "Resume".
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return 1;
  }
  return 0;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [demoOn, setDemoOn] = useState(false);

  // Refresh demo flag whenever the modal opens; localStorage is the source
  // of truth and may have changed while the palette was unmounted.
  useEffect(() => {
    if (open) setDemoOn(isDemoMode());
  }, [open]);

  // Toggle palette with ⌘K / Ctrl+K, close on Esc when nothing else is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setHighlight(0);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-focus the input on open and reset selection.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Imperative commands depend on router/demo state, so we materialize
  // the runner per render rather than baking it into STATIC_COMMANDS.
  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = STATIC_COMMANDS.map((c) => ({ ...c }));

    cmds.push({
      id: "act-toggle-demo",
      label: demoOn ? "Exit Demo Mode" : "Enter Demo Mode",
      hint: demoOn ? "Use your real data" : "Try without signing in",
      icon: PlayCircle,
      group: "Actions",
      keywords: ["sample", "trial", "preview"],
      run: () => {
        if (demoOn) disableDemoMode();
        else enableDemoMode();
        setOpen(false);
        // Refresh the page so api.ts re-evaluates the demo flag.
        router.refresh();
      },
    });

    if (isSupabaseConfigured()) {
      cmds.push({
        id: "act-signout",
        label: "Sign Out",
        icon: LogOut,
        group: "Account",
        keywords: ["logout", "leave"],
        run: async () => {
          try {
            await createClient().auth.signOut();
          } catch {
            /* offline fallback */
          }
          setOpen(false);
          router.push("/login");
        },
      });
    }

    return cmds;
  }, [demoOn, router]);

  const filtered = useMemo(() => {
    const scored = commands
      .map((c) => ({ cmd: c, score: matchScore(c, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((s) => s.cmd);
  }, [commands, query]);

  // Group matches for visual hierarchy without sacrificing rank order.
  const grouped = useMemo(() => {
    const order = ["Actions", "AI", "Navigate", "Account"] as const;
    const map = new Map<Command["group"], Command[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return order
      .map((g) => ({ group: g, items: map.get(g) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const flatList = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Reset highlight when filtered list shrinks below current index.
  useEffect(() => {
    if (highlight >= flatList.length) setHighlight(0);
  }, [flatList.length, highlight]);

  // Scroll highlighted row into view as user navigates with arrows.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${highlight}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const execute = useCallback(
    (cmd: Command) => {
      if (cmd.id === "act-help") {
        // Help overlay listens for this event so palette doesn't need
        // a hard import dependency on it.
        window.dispatchEvent(new CustomEvent("autoappli:open-shortcuts"));
        setOpen(false);
        return;
      }
      if (cmd.href) {
        router.push(cmd.href);
        setOpen(false);
      } else if (cmd.run) {
        void cmd.run();
      }
    },
    [router]
  );

  const onInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter" && flatList[highlight]) {
        e.preventDefault();
        execute(flatList[highlight]);
      }
    },
    [flatList, highlight, execute]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-zinc-950/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 border-b border-zinc-800">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 py-3 focus:outline-none"
            aria-label="Command search"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="mb-2 last:mb-0">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {g.group}
                </div>
                {g.items.map((cmd) => {
                  const idx = flatList.indexOf(cmd);
                  const active = idx === highlight;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      data-cmd-index={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => execute(cmd)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-blue-600/15 text-white"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-blue-300" : "text-zinc-500"
                        }`}
                      />
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="text-xs text-zinc-500 hidden sm:inline">
                          {cmd.hint}
                        </span>
                      )}
                      {active && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-blue-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-zinc-800 bg-zinc-950/40 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 px-1.5 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-zinc-700 px-1.5 font-mono">⏎</kbd>
              select
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            {flatList.length} commands
          </span>
        </div>
      </div>
    </div>
  );
}

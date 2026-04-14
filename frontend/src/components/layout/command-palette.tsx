"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Send, Search, BarChart3, CalendarCheck,
  Bell, DollarSign, Users, Clock, Zap, Settings, FileStack, PenTool,
  FileDown, Download, Command,
} from "lucide-react";

type CommandItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  keywords: string[];
};

const commands: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "kanban", "board"] },
  { id: "jobs", label: "Job Search", href: "/jobs", icon: Search, keywords: ["find", "search", "listings", "adzuna"] },
  { id: "resume", label: "Resume Builder", href: "/resume", icon: FileText, keywords: ["tailor", "pdf", "upload", "ai"] },
  { id: "cover-letter", label: "Cover Letter", href: "/cover-letter", icon: PenTool, keywords: ["write", "generate", "letter"] },
  { id: "outreach", label: "Outreach", href: "/outreach", icon: Send, keywords: ["email", "linkedin", "message", "recruiter"] },
  { id: "interviews", label: "Interview Prep", href: "/interviews", icon: CalendarCheck, keywords: ["prep", "questions", "practice"] },
  { id: "timeline", label: "Timeline", href: "/timeline", icon: Clock, keywords: ["history", "activity", "events"] },
  { id: "contacts", label: "Contacts", href: "/contacts", icon: Users, keywords: ["crm", "recruiter", "people"] },
  { id: "salary", label: "Salary Tracker", href: "/salary", icon: DollarSign, keywords: ["compensation", "pay", "offer", "money"] },
  { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell, keywords: ["reminders", "alerts"] },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3, keywords: ["stats", "funnel", "conversion", "charts"] },
  { id: "export", label: "Export Data", href: "/export", icon: FileDown, keywords: ["download", "csv", "json", "report"] },
  { id: "templates", label: "Templates", href: "/templates", icon: FileStack, keywords: ["docs", "document"] },
  { id: "resume-templates", label: "Resume Templates", href: "/resume-templates", icon: Download, keywords: ["harvard", "ats", "download"] },
  { id: "automation", label: "Automation", href: "/automation", icon: Zap, keywords: ["rules", "triggers"] },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, keywords: ["profile", "account", "password"] },
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Command className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500 text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => navigate(cmd.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-blue-600/15 text-blue-300"
                      : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${i === selectedIndex ? "text-blue-400" : "text-zinc-500"}`} />
                  <span className="truncate">{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-[10px] text-zinc-600">
          <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

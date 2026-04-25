"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Send,
  Search,
  BarChart3,
  CalendarCheck,
  Bell,
  DollarSign,
  Users,
  Clock,
  Zap,
  Settings,
  Menu,
  X,
  FileStack,
  PenTool,
  FileDown,
  Download,
  Compass,
  BookText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { FeedbackWidget } from "@/components/layout/feedback-widget";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Core",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/discover", label: "Discover", icon: Compass },
      { href: "/jobs", label: "Job Search", icon: Search },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { href: "/resume", label: "Resume Builder", icon: FileText },
      { href: "/cover-letter", label: "Cover Letter", icon: PenTool },
      { href: "/outreach", label: "Outreach", icon: Send },
      { href: "/interviews", label: "Interview Prep", icon: CalendarCheck },
      { href: "/stories", label: "Stories", icon: BookText },
    ],
  },
  {
    title: "Tracking",
    items: [
      { href: "/timeline", label: "Timeline", icon: Clock },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/salary", label: "Salary Tracker", icon: DollarSign },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/export", label: "Export", icon: FileDown },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: "/templates", label: "Templates", icon: FileStack },
      { href: "/resume-templates", label: "Resume Templates", icon: Download },
      { href: "/automation", label: "Automation", icon: Zap },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // Close on Esc when the mobile drawer is open; return focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        ref={toggleRef}
        variant="ghost"
        size="icon"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="primary-sidebar"
        className="fixed top-4 left-4 z-50 md:hidden text-zinc-300"
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
      </Button>
      <aside
        id="primary-sidebar"
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 md:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          aria-label="AutoAppli home"
          className="flex items-center gap-2.5 px-6 py-5 border-b border-zinc-800 shrink-0 hover:bg-zinc-900/50 transition-colors"
        >
          <div
            aria-hidden="true"
            className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            A
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">AutoAppli</span>
        </Link>

        <nav aria-label="Primary" className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                        isActive
                          ? "bg-blue-600/15 text-blue-400 shadow-sm shadow-blue-500/5"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                      )}
                    >
                      <item.icon
                        aria-hidden="true"
                        className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-blue-400")}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 px-4 py-3 border-t border-zinc-800 space-y-2">
          <FeedbackWidget />
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500">
            <Link
              href="/privacy"
              onClick={() => setOpen(false)}
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy
            </Link>
            <span className="text-zinc-700" aria-hidden="true">
              ·
            </span>
            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="hover:text-zinc-300 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </aside>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

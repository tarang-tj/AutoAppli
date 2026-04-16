"use client";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types";

const TABS: { id: JobStatus; label: string; color: string }[] = [
  { id: "bookmarked", label: "Saved", color: "bg-zinc-500" },
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "interviewing", label: "Interview", color: "bg-yellow-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
  { id: "ghosted", label: "Ghosted", color: "bg-zinc-600" },
];

interface KanbanMobileTabsProps {
  activeTab: JobStatus | null;
  onTabChange: (tab: JobStatus | null) => void;
  counts: Record<string, number>;
}

export function KanbanMobileTabs({
  activeTab,
  onTabChange,
  counts,
}: KanbanMobileTabsProps) {
  return (
    <div className="lg:hidden -mx-1 px-1 mb-3">
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => onTabChange(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            activeTab === null
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          )}
        >
          All
        </button>
        {TABS.map((tab) => {
          const count = counts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  tab.color
                )}
              />
              {tab.label}
              {count > 0 && (
                <span className="text-[10px] tabular-nums opacity-70">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useStableNow } from "@/hooks/use-stable-now";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  History,
  Link2,
  Loader2,
  MessageSquare,
  MoreVertical,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { InterviewPracticeSession } from "@/types";

/**
 * PracticeHistoryPanel — enhanced history rail for /interviews/practice.
 *
 * Drops into the right rail of the setup phase. Adds:
 *   - Search box (filters by title + company, case-insensitive).
 *   - Group-by toggle: "By date" (Today / This week / This month / Older)
 *     and "By company".
 *   - Stats strip: total sessions · this-week count · top company.
 *   - Per-row action menu: Practice again · Copy transcript · Share link · Delete.
 *
 * Stateless beyond UI state — the page owns data fetching and handlers.
 */

type Props = {
  sessions: InterviewPracticeSession[] | undefined;
  persistEnabled: boolean;
  onOpen: (id: string) => void;
  onReplay: (s: InterviewPracticeSession) => void;
  onCopy: (s: InterviewPracticeSession) => void;
  onShare: (s: InterviewPracticeSession) => void;
  onDelete: (id: string) => void;
};

type GroupMode = "date" | "company";

const DAY = 86_400_000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  // Monday as start of week; Sunday (0) rolls back 6 days.
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

function startOfMonth(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.getTime();
}

function bucketForDate(t: number, now: number): string {
  const today = startOfDay(now);
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  if (t >= today) return "Today";
  if (t >= today - DAY) return "Yesterday";
  if (t >= week) return "This week";
  if (t >= month) return "This month";
  return "Older";
}

const DATE_BUCKET_ORDER = [
  "Today",
  "Yesterday",
  "This week",
  "This month",
  "Older",
];


export function PracticeHistoryPanel({
  sessions,
  persistEnabled,
  onOpen,
  onReplay,
  onCopy,
  onShare,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const now = useStableNow();

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const hay = `${s.job_title} ${s.company}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sessions, query]);

  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { total: 0, thisWeek: 0, topCompany: null as string | null };
    }
    const weekAgo = now - 7 * DAY;
    let thisWeek = 0;
    const byCompany = new Map<string, number>();
    for (const s of sessions) {
      const created = Date.parse(s.created_at);
      if (Number.isFinite(created) && created >= weekAgo) thisWeek++;
      const key = s.company || "Unknown";
      byCompany.set(key, (byCompany.get(key) ?? 0) + 1);
    }
    let topCompany: string | null = null;
    let topCount = 0;
    for (const [company, count] of byCompany) {
      if (count > topCount) {
        topCompany = company;
        topCount = count;
      }
    }
    return { total: sessions.length, thisWeek, topCompany };
  }, [sessions, now]);

  const groups = useMemo(() => {
    if (filtered.length === 0) return [] as Array<[string, InterviewPracticeSession[]]>;
    const map = new Map<string, InterviewPracticeSession[]>();

    if (groupMode === "date") {
      for (const label of DATE_BUCKET_ORDER) map.set(label, []);
      for (const s of filtered) {
        const t = Date.parse(s.created_at);
        const label = Number.isFinite(t) ? bucketForDate(t, now) : "Older";
        const list = map.get(label) ?? [];
        list.push(s);
        map.set(label, list);
      }
      return DATE_BUCKET_ORDER.filter((k) => (map.get(k) ?? []).length > 0).map(
        (k) => [k, map.get(k) ?? []] as [string, InterviewPracticeSession[]]
      );
    }

    // By company — alphabetical with session counts
    for (const s of filtered) {
      const key = s.company || "Unknown";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [filtered, groupMode, now]);

  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col"
      onClick={() => {
        if (openMenuId) setOpenMenuId(null);
      }}
    >
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-zinc-400" aria-hidden />
          <h2 className="text-sm font-semibold text-white">Past sessions</h2>
        </div>

        {!persistEnabled ? (
          <p className="text-xs text-zinc-500 leading-relaxed">
            Connect Supabase to save transcripts. Without it, each session is
            ephemeral and won&apos;t appear here.
          </p>
        ) : !sessions ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-zinc-500 leading-relaxed">
            No sessions yet. Once you finish a practice run, it&apos;ll show up
            here so you can revisit the transcript.
          </p>
        ) : (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatChip
                icon={MessageSquare}
                label="Total"
                value={stats.total.toString()}
              />
              <StatChip
                icon={TrendingUp}
                label="This week"
                value={stats.thisWeek.toString()}
                highlight={stats.thisWeek > 0}
              />
              <StatChip
                icon={Building2}
                label="Most"
                value={stats.topCompany ?? "—"}
                truncate
              />
            </div>

            {/* Search + group toggle */}
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title or company…"
                  aria-label="Search past practice sessions"
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-xs text-white pl-8 pr-2 py-1.5 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div
                role="tablist"
                aria-label="Group sessions by"
                className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/40 p-0.5 text-[11px]"
              >
                <GroupToggle
                  active={groupMode === "date"}
                  onClick={() => setGroupMode("date")}
                  icon={Calendar}
                  label="By date"
                />
                <GroupToggle
                  active={groupMode === "company"}
                  onClick={() => setGroupMode("company")}
                  icon={Building2}
                  label="By company"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {sessions && sessions.length > 0 && (
        <div className="flex-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-zinc-500 text-center">
              No sessions match &quot;{query}&quot;.
            </p>
          ) : (
            <ul className="p-2 space-y-3 max-h-[460px] overflow-y-auto">
              {groups.map(([label, rows]) => (
                <li key={label}>
                  <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
                    <span className="font-medium">{label}</span>
                    <span className="text-zinc-600">{rows.length}</span>
                  </div>
                  <ul className="space-y-1">
                    {rows.map((s) => (
                      <SessionRow
                        key={s.id}
                        session={s}
                        menuOpen={openMenuId === s.id}
                        onToggleMenu={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((cur) => (cur === s.id ? null : s.id));
                        }}
                        onCloseMenu={() => setOpenMenuId(null)}
                        onOpen={() => onOpen(s.id)}
                        onReplay={() => onReplay(s)}
                        onCopy={() => onCopy(s)}
                        onShare={() => onShare(s)}
                        onDelete={() => onDelete(s.id)}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  label,
  value,
  highlight,
  truncate,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  truncate?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-2 ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-950/60"
      }`}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold text-white ${
          truncate ? "truncate" : ""
        }`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function GroupToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 transition-colors ${
        active
          ? "bg-zinc-800 text-white"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function SessionRow({
  session,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpen,
  onReplay,
  onCopy,
  onShare,
  onDelete,
}: {
  session: InterviewPracticeSession;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onOpen: () => void;
  onReplay: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/80 transition-colors pr-10"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <MessageSquare
            className="h-3 w-3 text-zinc-500 shrink-0"
            aria-hidden
          />
          <p className="text-sm text-zinc-100 truncate">
            {session.job_title} · {session.company}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
          <Clock className="h-2.5 w-2.5" aria-hidden />
          {new Date(session.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          <span className="text-zinc-700">·</span>
          {session.turn_count} turn{session.turn_count === 1 ? "" : "s"}
          {session.ended && (
            <span className="inline-flex items-center gap-0.5 text-emerald-300/90">
              <CheckCircle2 className="h-2.5 w-2.5" />
              debriefed
            </span>
          )}
        </p>
      </button>
      <button
        type="button"
        aria-label="Session actions"
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
        className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/80 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute z-20 right-2 top-full mt-1 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40 py-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={RotateCcw}
            label="Practice again"
            onClick={() => {
              onReplay();
              onCloseMenu();
            }}
          />
          <MenuItem
            icon={Copy}
            label="Copy transcript"
            onClick={() => {
              onCopy();
              onCloseMenu();
            }}
          />
          <MenuItem
            icon={Link2}
            label="Share link"
            onClick={() => {
              onShare();
              onCloseMenu();
            }}
          />
          <div className="border-t border-zinc-800 my-1" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              onDelete();
              onCloseMenu();
            }}
          />
        </div>
      )}
    </li>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
        danger
          ? "text-red-300 hover:bg-red-500/10"
          : "text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

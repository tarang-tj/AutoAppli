"use client";

import { useMemo, useState } from "react";
import { diffResumes, diffWords, type DiffChunk, type DiffOp } from "@/lib/resume-diff";
import { cn } from "@/lib/utils";
import { FileText, Minus, Plus, SplitSquareHorizontal, AlignJustify } from "lucide-react";

/**
 * ResumeDiffView — visualize what the tailor step changed.
 *
 * Two layouts:
 *   - "unified"  : single column, +/- prefixed lines à la git diff
 *   - "split"    : two columns, original on the left, tailored on the right,
 *                  removed↔added pairs aligned side-by-side with word-level
 *                  highlights inside each line.
 *
 * Default is "split" on desktop, "unified" on narrow. Both are dense enough
 * to scan quickly; this view answers the question "did the AI exaggerate?"
 */
export function ResumeDiffView({
  original,
  tailored,
}: {
  original: string;
  tailored: string;
}) {
  const [mode, setMode] = useState<"split" | "unified">("split");

  const { chunks, stats } = useMemo(
    () => diffResumes(original, tailored),
    [original, tailored]
  );

  if (!original?.trim()) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-sm text-zinc-400">
        Original resume text isn&apos;t available for this document. Re-generate
        from the builder to enable diff view.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary + mode toggle strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="flex items-center gap-3 text-xs">
          <StatChip label="added" count={stats.added} op="added" icon={Plus} />
          <StatChip label="removed" count={stats.removed} op="removed" icon={Minus} />
          <span className="text-zinc-500">
            {(stats.similarity * 100).toFixed(0)}% unchanged
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          <ModeBtn
            active={mode === "split"}
            onClick={() => setMode("split")}
            icon={<SplitSquareHorizontal className="h-3.5 w-3.5" />}
            label="Side-by-side"
          />
          <ModeBtn
            active={mode === "unified"}
            onClick={() => setMode("unified")}
            icon={<AlignJustify className="h-3.5 w-3.5" />}
            label="Unified"
          />
        </div>
      </div>

      {mode === "split" ? (
        <SplitView chunks={chunks} />
      ) : (
        <UnifiedView chunks={chunks} />
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Review changes carefully — AI tailoring can reword facts. Treat this
        as a first draft, not a final.
      </p>
    </div>
  );
}

function StatChip({
  label,
  count,
  op,
  icon: Icon,
}: {
  label: string;
  count: number;
  op: DiffOp;
  icon: typeof Plus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
        op === "added" && "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
        op === "removed" && "bg-rose-500/10 text-rose-300 border border-rose-500/20"
      )}
    >
      <Icon className="h-3 w-3" />
      {count} {label}
    </span>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-zinc-100 text-zinc-900"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Unified view ──────────────────────────────────────────────────────────
function UnifiedView({ chunks }: { chunks: DiffChunk[] }) {
  return (
    <div className="max-h-[min(72vh,720px)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
      <pre className="text-[13px] leading-relaxed font-mono">
        {chunks.map((c, i) => (
          <UnifiedRow key={i} chunk={c} />
        ))}
      </pre>
    </div>
  );
}

function UnifiedRow({ chunk }: { chunk: DiffChunk }) {
  const base = "flex items-start gap-3 px-3 py-0.5 whitespace-pre-wrap";
  if (chunk.op === "added") {
    return (
      <div className={cn(base, "bg-emerald-500/10 text-emerald-100")}>
        <span className="select-none text-emerald-400 w-4 shrink-0">+</span>
        <span className="flex-1">{chunk.text || " "}</span>
      </div>
    );
  }
  if (chunk.op === "removed") {
    return (
      <div className={cn(base, "bg-rose-500/10 text-rose-100")}>
        <span className="select-none text-rose-400 w-4 shrink-0">−</span>
        <span className="flex-1 line-through decoration-rose-400/50">
          {chunk.text || " "}
        </span>
      </div>
    );
  }
  return (
    <div className={cn(base, "text-zinc-400")}>
      <span className="select-none text-zinc-600 w-4 shrink-0"> </span>
      <span className="flex-1">{chunk.text || " "}</span>
    </div>
  );
}

// ─── Split view ────────────────────────────────────────────────────────────

type SplitRow =
  | { kind: "same"; text: string }
  | { kind: "change"; removed: string[]; added: string[] };

/**
 * Group the flat chunk stream into rows:
 * - `same`: single unchanged line
 * - `change`: an adjacent block of removed lines + added lines; rendered in
 *   one horizontal row so pairs line up visually.
 */
function groupIntoRows(chunks: DiffChunk[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let pendingRemoved: string[] = [];
  let pendingAdded: string[] = [];

  const flush = () => {
    if (pendingRemoved.length || pendingAdded.length) {
      rows.push({ kind: "change", removed: pendingRemoved, added: pendingAdded });
      pendingRemoved = [];
      pendingAdded = [];
    }
  };

  for (const c of chunks) {
    if (c.op === "unchanged") {
      flush();
      rows.push({ kind: "same", text: c.text });
    } else if (c.op === "removed") {
      pendingRemoved.push(c.text);
    } else {
      pendingAdded.push(c.text);
    }
  }
  flush();
  return rows;
}

function SplitView({ chunks }: { chunks: DiffChunk[] }) {
  const rows = useMemo(() => groupIntoRows(chunks), [chunks]);

  return (
    <div className="max-h-[min(72vh,720px)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="grid grid-cols-2 text-[13px] font-mono leading-relaxed">
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-r border-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Original
        </div>
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Tailored
        </div>
        {rows.map((row, i) => (
          <SplitRowView key={i} row={row} />
        ))}
      </div>
    </div>
  );
}

function SplitRowView({ row }: { row: SplitRow }) {
  if (row.kind === "same") {
    return (
      <>
        <div className="px-3 py-0.5 text-zinc-400 border-r border-zinc-900 whitespace-pre-wrap">
          {row.text || " "}
        </div>
        <div className="px-3 py-0.5 text-zinc-400 whitespace-pre-wrap">
          {row.text || " "}
        </div>
      </>
    );
  }

  // For a "change" row, pair up removed[i] with added[i] for word-level
  // highlighting. If counts differ, unpaired lines still render in their
  // column.
  const pairCount = Math.max(row.removed.length, row.added.length);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < pairCount; i++) {
    const l = row.removed[i];
    const r = row.added[i];
    const words = l !== undefined && r !== undefined ? diffWords(l, r) : null;

    out.push(
      <div
        key={`l-${i}`}
        className={cn(
          "px-3 py-0.5 border-r border-zinc-900 whitespace-pre-wrap",
          l !== undefined
            ? "bg-rose-500/10 text-rose-100"
            : "bg-zinc-900/40"
        )}
      >
        {l !== undefined
          ? words
            ? words.left.map((w, k) => (
                <span
                  key={k}
                  className={cn(
                    w.op === "removed" && "bg-rose-500/30 text-rose-50 rounded px-0.5"
                  )}
                >
                  {w.text}
                </span>
              ))
            : l || " "
          : " "}
      </div>
    );
    out.push(
      <div
        key={`r-${i}`}
        className={cn(
          "px-3 py-0.5 whitespace-pre-wrap",
          r !== undefined
            ? "bg-emerald-500/10 text-emerald-100"
            : "bg-zinc-900/40"
        )}
      >
        {r !== undefined
          ? words
            ? words.right.map((w, k) => (
                <span
                  key={k}
                  className={cn(
                    w.op === "added" && "bg-emerald-500/30 text-emerald-50 rounded px-0.5"
                  )}
                >
                  {w.text}
                </span>
              ))
            : r || " "
          : " "}
      </div>
    );
  }
  return <>{out}</>;
}

"use client";

import { useMemo, useState } from "react";
import { diffResumes, diffWords, type DiffChunk, type DiffOp } from "@/lib/resume-diff";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlignJustify,
  Check,
  Copy,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  X,
} from "lucide-react";

/**
 * ResumeDiffView — visualize what the tailor step changed, and let the user
 * cherry-pick which changes to keep.
 *
 * Two layouts:
 *   - "unified"  : single column, +/- prefixed lines à la git diff
 *   - "split"    : two columns, original on the left, tailored on the right,
 *                  removed↔added pairs aligned side-by-side with word-level
 *                  highlights inside each line.
 *
 * Every change block gets a revert toggle. Reverted blocks fall back to the
 * original text; the combined output is the "hybrid resume" which the user
 * can copy to clipboard with the toolbar button. Parents that want to push
 * the hybrid back into app state can pass `onApplyHybrid`.
 */
export function ResumeDiffView({
  original,
  tailored,
  onApplyHybrid,
  rejectedRows: controlledRejected,
  onRejectedRowsChange,
}: {
  original: string;
  tailored: string;
  /**
   * If provided, an "Apply hybrid" button appears alongside "Copy hybrid"
   * and calls this with the final hybrid text. Omit for read-only views.
   */
  onApplyHybrid?: (text: string) => void;
  /**
   * Optional controlled state for per-row reject decisions. When both props
   * are supplied the parent owns the state; otherwise the component manages
   * it internally. Lift this to the parent to preserve decisions across
   * tab switches that unmount the diff view.
   */
  rejectedRows?: Record<number, true>;
  onRejectedRowsChange?: (next: Record<number, true>) => void;
}) {
  const [mode, setMode] = useState<"split" | "unified">("split");
  const [internalRejected, setInternalRejected] = useState<Record<number, true>>({});
  const rejectedRows = controlledRejected ?? internalRejected;
  const writeRejected = (next: Record<number, true>) => {
    if (onRejectedRowsChange) onRejectedRowsChange(next);
    else setInternalRejected(next);
  };

  const { chunks, stats } = useMemo(
    () => diffResumes(original, tailored),
    [original, tailored]
  );

  const rows = useMemo(() => groupIntoRows(chunks), [chunks]);
  const totalChangeRows = useMemo(
    () => rows.filter((r) => r.kind === "change").length,
    [rows]
  );
  const rejectedCount = Object.keys(rejectedRows).length;
  const keptCount = totalChangeRows - rejectedCount;

  const hybridText = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.kind === "same") {
        lines.push(row.text);
      } else if (rejectedRows[i]) {
        lines.push(...row.removed);
      } else {
        lines.push(...row.added);
      }
    }
    return lines.join("\n");
  }, [rows, rejectedRows]);

  const toggleRow = (i: number) => {
    const next = { ...rejectedRows };
    if (next[i]) delete next[i];
    else next[i] = true;
    writeRejected(next);
  };

  const resetAll = () => writeRejected({});

  const copyHybrid = async () => {
    try {
      await navigator.clipboard.writeText(hybridText);
      toast.success(
        rejectedCount > 0
          ? `Copied hybrid · ${rejectedCount} change${rejectedCount === 1 ? "" : "s"} reverted`
          : "Copied tailored resume"
      );
    } catch {
      toast.error("Couldn’t copy to clipboard");
    }
  };

  const applyHybrid = () => {
    if (!onApplyHybrid) return;
    onApplyHybrid(hybridText);
    toast.success(
      rejectedCount > 0
        ? `Applied hybrid · kept ${keptCount}/${totalChangeRows} AI changes`
        : "Applied tailored resume"
    );
  };

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
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <StatChip label="added" count={stats.added} op="added" icon={Plus} />
          <StatChip label="removed" count={stats.removed} op="removed" icon={Minus} />
          <span className="text-zinc-500">
            {(stats.similarity * 100).toFixed(0)}% unchanged
          </span>
          {totalChangeRows > 0 ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 border",
                rejectedCount === 0
                  ? "text-zinc-400 border-zinc-800"
                  : "text-amber-200 border-amber-500/30 bg-amber-500/10"
              )}
            >
              {keptCount}/{totalChangeRows} AI changes kept
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rejectedCount > 0 ? (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              title="Restore every AI suggestion"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          ) : null}
          <button
            type="button"
            onClick={copyHybrid}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            title="Copy the current hybrid to clipboard"
          >
            <Copy className="h-3 w-3" />
            Copy hybrid
          </button>
          {onApplyHybrid ? (
            <button
              type="button"
              onClick={applyHybrid}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/25"
              title="Replace the tailored resume with this hybrid"
            >
              <Check className="h-3 w-3" />
              Apply hybrid
            </button>
          ) : null}
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
      </div>

      {mode === "split" ? (
        <SplitView rows={rows} rejectedRows={rejectedRows} onToggle={toggleRow} />
      ) : (
        <UnifiedView rows={rows} rejectedRows={rejectedRows} onToggle={toggleRow} />
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <FileText className="h-3 w-3" />
        Click the ✕ next to any change to revert just that block — use Copy
        hybrid (or Apply) to take the final cherry-picked version.
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

// ─── Row grouping ──────────────────────────────────────────────────────────

type SplitRow =
  | { kind: "same"; text: string }
  | { kind: "change"; removed: string[]; added: string[] };

/**
 * Group the flat chunk stream into rows:
 * - `same`: single unchanged line
 * - `change`: an adjacent block of removed lines + added lines; each change
 *   is one cherry-pick unit (one toggle per block).
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

// ─── Unified view ──────────────────────────────────────────────────────────

function UnifiedView({
  rows,
  rejectedRows,
  onToggle,
}: {
  rows: SplitRow[];
  rejectedRows: Record<number, true>;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="max-h-[min(72vh,720px)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
      <pre className="text-[13px] leading-relaxed font-mono">
        {rows.map((row, i) =>
          row.kind === "same" ? (
            <UnifiedSameLine key={i} text={row.text} />
          ) : (
            <UnifiedChangeGroup
              key={i}
              row={row}
              rejected={Boolean(rejectedRows[i])}
              onToggle={() => onToggle(i)}
            />
          )
        )}
      </pre>
    </div>
  );
}

function UnifiedSameLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 px-3 py-0.5 whitespace-pre-wrap text-zinc-400">
      <span className="select-none text-zinc-600 w-4 shrink-0"> </span>
      <span className="flex-1">{text || " "}</span>
    </div>
  );
}

function UnifiedChangeGroup({
  row,
  rejected,
  onToggle,
}: {
  row: Extract<SplitRow, { kind: "change" }>;
  rejected: boolean;
  onToggle: () => void;
}) {
  const lineClass = "flex items-start gap-3 px-3 py-0.5 whitespace-pre-wrap";
  return (
    <div>
      {row.removed.map((line, k) => (
        <div
          key={`r-${k}`}
          className={cn(
            lineClass,
            rejected ? "text-zinc-300 bg-zinc-900/40" : "bg-rose-500/10 text-rose-100"
          )}
        >
          <span className="select-none w-4 shrink-0 flex items-start justify-center">
            {k === 0 ? (
              <RowToggle rejected={rejected} onToggle={onToggle} />
            ) : (
              <span className="text-rose-400">−</span>
            )}
          </span>
          <span
            className={cn(
              "flex-1",
              !rejected && "line-through decoration-rose-400/50"
            )}
          >
            {line || " "}
          </span>
        </div>
      ))}
      {!rejected
        ? row.added.map((line, k) => (
            <div
              key={`a-${k}`}
              className={cn(lineClass, "bg-emerald-500/10 text-emerald-100")}
            >
              <span className="select-none text-emerald-400 w-4 shrink-0">+</span>
              <span className="flex-1">{line || " "}</span>
            </div>
          ))
        : null}
    </div>
  );
}

// ─── Split view ────────────────────────────────────────────────────────────

function SplitView({
  rows,
  rejectedRows,
  onToggle,
}: {
  rows: SplitRow[];
  rejectedRows: Record<number, true>;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="max-h-[min(72vh,720px)] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="grid grid-cols-[2.25rem_1fr_1fr] text-[13px] font-mono leading-relaxed">
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-r border-zinc-800" />
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-r border-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Original
        </div>
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Tailored
        </div>
        {rows.map((row, i) => (
          <SplitRowView
            key={i}
            row={row}
            rejected={Boolean(rejectedRows[i])}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}

function SplitRowView({
  row,
  rejected,
  onToggle,
}: {
  row: SplitRow;
  rejected: boolean;
  onToggle: () => void;
}) {
  if (row.kind === "same") {
    return (
      <>
        <div className="border-r border-zinc-900" />
        <div className="px-3 py-0.5 text-zinc-400 border-r border-zinc-900 whitespace-pre-wrap">
          {row.text || " "}
        </div>
        <div className="px-3 py-0.5 text-zinc-400 whitespace-pre-wrap">
          {row.text || " "}
        </div>
      </>
    );
  }

  // For a "change" row, pair removed[i] with added[i] for word-level
  // highlighting. Only the first marker cell shows the toggle — subsequent
  // pairs in the block share the decision.
  const pairCount = Math.max(row.removed.length, row.added.length);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < pairCount; i++) {
    const l = row.removed[i];
    const r = row.added[i];
    const words = l !== undefined && r !== undefined ? diffWords(l, r) : null;

    // Marker column (toggle button on first pair only).
    out.push(
      <div
        key={`m-${i}`}
        className={cn(
          "border-r border-zinc-900 flex items-start justify-center pt-0.5",
          rejected && "bg-zinc-900/40"
        )}
      >
        {i === 0 ? <RowToggle rejected={rejected} onToggle={onToggle} /> : null}
      </div>
    );

    // Left column — always the original line.
    out.push(
      <div
        key={`l-${i}`}
        className={cn(
          "px-3 py-0.5 border-r border-zinc-900 whitespace-pre-wrap",
          l === undefined
            ? "bg-zinc-900/40"
            : rejected
            ? "text-zinc-300 bg-zinc-900/40"
            : "bg-rose-500/10 text-rose-100"
        )}
      >
        {l !== undefined
          ? rejected
            ? l || " "
            : words
            ? words.left.map((w, k) => (
                <span
                  key={k}
                  className={cn(
                    w.op === "removed" &&
                      "bg-rose-500/30 text-rose-50 rounded px-0.5"
                  )}
                >
                  {w.text}
                </span>
              ))
            : l || " "
          : " "}
      </div>
    );

    // Right column — tailored line, or the original echoed if the row is
    // reverted (so both columns match visually when the change is dropped).
    out.push(
      <div
        key={`r-${i}`}
        className={cn(
          "px-3 py-0.5 whitespace-pre-wrap",
          rejected
            ? l !== undefined
              ? "text-zinc-300 bg-zinc-900/40"
              : "bg-zinc-900/20"
            : r !== undefined
            ? "bg-emerald-500/10 text-emerald-100"
            : "bg-zinc-900/40"
        )}
      >
        {rejected
          ? l !== undefined
            ? l || " "
            : " "
          : r !== undefined
          ? words
            ? words.right.map((w, k) => (
                <span
                  key={k}
                  className={cn(
                    w.op === "added" &&
                      "bg-emerald-500/30 text-emerald-50 rounded px-0.5"
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

function RowToggle({
  rejected,
  onToggle,
}: {
  rejected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        rejected
          ? "Restore the AI suggestion"
          : "Revert this change (keep the original)"
      }
      aria-label={rejected ? "Restore AI suggestion" : "Revert to original"}
      className={cn(
        "h-5 w-5 rounded flex items-center justify-center transition-colors",
        rejected
          ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
          : "bg-zinc-800 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300"
      )}
    >
      {rejected ? <RotateCcw className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </button>
  );
}

/**
 * Line-level diff tuned for resumes.
 *
 * Classic LCS backtrack — O(n*m) time and space, which is fine for resumes
 * (typically <300 lines). Output is a flat list of `DiffChunk` entries, one
 * per line, in final render order. Consecutive removed-then-added pairs are
 * treated as a "replacement" (no special type — the renderer just renders
 * them adjacent) so they visually line up.
 *
 * We ignore pure-whitespace changes and collapse trailing spaces before
 * comparing, so the diff doesn't light up red every time the LLM re-indents
 * a bullet.
 */

export type DiffOp = "unchanged" | "added" | "removed";

export interface DiffChunk {
  op: DiffOp;
  text: string;
  /** 1-based line number in the original document (for "removed"/"unchanged"). */
  origLine?: number;
  /** 1-based line number in the tailored document (for "added"/"unchanged"). */
  newLine?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
  similarity: number; // 0-1, share of lines that match
}

function normalize(line: string): string {
  return line.replace(/\s+$/g, "").trim();
}

/**
 * Compute line-level diff.
 *
 * Returns chunks plus summary stats. Treat the stats as advisory — they're
 * for the "+N / -M" strip at the top of the diff view.
 */
export function diffResumes(original: string, tailored: string): {
  chunks: DiffChunk[];
  stats: DiffStats;
} {
  const a = (original || "").replace(/\r\n?/g, "\n").split("\n");
  const b = (tailored || "").replace(/\r\n?/g, "\n").split("\n");

  // LCS dynamic programming table.
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (normalize(a[i]) === normalize(b[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to produce the diff script.
  const chunks: DiffChunk[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (normalize(a[i]) === normalize(b[j])) {
      chunks.push({
        op: "unchanged",
        text: b[j],
        origLine: i + 1,
        newLine: j + 1,
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      chunks.push({ op: "removed", text: a[i], origLine: i + 1 });
      i++;
    } else {
      chunks.push({ op: "added", text: b[j], newLine: j + 1 });
      j++;
    }
  }
  while (i < n) {
    chunks.push({ op: "removed", text: a[i], origLine: i + 1 });
    i++;
  }
  while (j < m) {
    chunks.push({ op: "added", text: b[j], newLine: j + 1 });
    j++;
  }

  // Collapse consecutive blank unchanged lines down to one to keep the view
  // compact without hiding structural whitespace entirely.
  const compact: DiffChunk[] = [];
  let prevBlankUnchanged = false;
  for (const c of chunks) {
    const isBlankUnchanged = c.op === "unchanged" && c.text.trim() === "";
    if (isBlankUnchanged && prevBlankUnchanged) continue;
    compact.push(c);
    prevBlankUnchanged = isBlankUnchanged;
  }

  const added = chunks.filter((c) => c.op === "added").length;
  const removed = chunks.filter((c) => c.op === "removed").length;
  const unchanged = chunks.filter((c) => c.op === "unchanged").length;
  const total = added + removed + unchanged || 1;

  return {
    chunks: compact,
    stats: {
      added,
      removed,
      unchanged,
      similarity: unchanged / total,
    },
  };
}

/**
 * Word-level diff for a pair of lines. Used inside "removed → added" pairs
 * to highlight which words actually changed.
 *
 * Returns matched pairs `[leftWords[], rightWords[]]` where each word is
 * tagged with an op. This is LCS again but over tokens; since lines are
 * short (<100 words), the cost is negligible.
 */
export function diffWords(
  left: string,
  right: string
): { left: { op: DiffOp; text: string }[]; right: { op: DiffOp; text: string }[] } {
  // Split on whitespace but keep the whitespace tokens so we can reconstruct
  // the line. Pattern matches words OR runs of whitespace.
  const splitRegex = /(\S+|\s+)/g;
  const A = left.match(splitRegex) ?? [];
  const B = right.match(splitRegex) ?? [];
  const n = A.length;
  const m = B.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const leftOut: { op: DiffOp; text: string }[] = [];
  const rightOut: { op: DiffOp; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      leftOut.push({ op: "unchanged", text: A[i] });
      rightOut.push({ op: "unchanged", text: B[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      leftOut.push({ op: "removed", text: A[i] });
      i++;
    } else {
      rightOut.push({ op: "added", text: B[j] });
      j++;
    }
  }
  while (i < n) {
    leftOut.push({ op: "removed", text: A[i] });
    i++;
  }
  while (j < m) {
    rightOut.push({ op: "added", text: B[j] });
    j++;
  }
  return { left: leftOut, right: rightOut };
}

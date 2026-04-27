/**
 * star-split — heuristic STAR decomposition of a free-text interview answer.
 *
 * WHY: Rather than presenting an empty form, give the user something concrete
 * to react to and edit. The split is intentionally rough — a user who just
 * answered a behavioural question can quickly rearrange the pre-filled text
 * into the right slots. Accuracy matters less than having a starting point.
 *
 * Algorithm (KISS):
 *   Split text into sentences on ". " / "! " / "? " boundaries.
 *   - < 4 sentences → dump everything into `action`, leave others empty.
 *   - ≥ 4 sentences →
 *       situation = sentence[0]
 *       task      = sentence[1]
 *       action    = sentences[2 .. n-2].join(" ")
 *       result    = sentence[n-1]
 *
 * Tags are left empty — the user knows their own context better than we do.
 */

export interface StarPayload {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags?: string[];
}

/** Split text into sentences (rough but good enough for pre-fill). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build a StarPayload from a question + free-text answer.
 * The title uses the question (truncated to 80 chars).
 */
export function starSplit(question: string, answer: string): StarPayload {
  // Truncate to 80 chars total: 79 chars of content + the "…" ellipsis char.
  const title = question.length > 80 ? question.slice(0, 79) + "…" : question;
  const sentences = splitSentences(answer);

  if (sentences.length < 4) {
    // Too short to meaningfully split — dump everything into action.
    return { title, situation: "", task: "", action: answer.trim(), result: "", tags: [] };
  }

  const situation = sentences[0];
  const task = sentences[1];
  const result = sentences[sentences.length - 1];
  const action = sentences.slice(2, sentences.length - 1).join(" ");

  return { title, situation, task, action, result, tags: [] };
}

/**
 * Encode a StarPayload as a base64url string safe for use in a URL query param.
 * Returns null if serialization fails (should never happen in practice).
 */
export function encodeImportPayload(payload: StarPayload): string | null {
  try {
    const json = JSON.stringify(payload);
    // btoa works on ASCII; encode to UTF-8 percent encoding first
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return null;
  }
}

/**
 * Decode an import payload from a base64 string.
 * Returns null (silently) on any parse/decode error — no toast spam.
 */
export function decodeImportPayload(encoded: string): StarPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const obj = JSON.parse(json) as unknown;
    if (!isStarPayload(obj)) return null;
    return obj;
  } catch {
    return null;
  }
}

function isStarPayload(v: unknown): v is StarPayload {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    typeof obj.situation === "string" &&
    typeof obj.task === "string" &&
    typeof obj.action === "string" &&
    typeof obj.result === "string"
  );
}

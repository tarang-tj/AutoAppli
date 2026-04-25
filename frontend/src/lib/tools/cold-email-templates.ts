/**
 * Cold email template generator for /tools/cold-email-generator.
 *
 * Pure heuristics — no AI, no I/O, deterministic.
 * Three classic cold-outreach patterns:
 *   1. Short curious  — very brief, genuine curiosity hook
 *   2. Value-first    — lead with a concrete observation about their work
 *   3. Ask-for-advice — lower-ask framing, easier to say yes to
 *
 * Each template produces a subject line + email body by interpolating
 * real user inputs, not placeholders. The goal is text the user can
 * send with minor tweaks, not a fill-in-the-blank skeleton.
 */

export interface ColdEmailInputs {
  targetName: string;       // first name or full name of recipient
  targetCompany: string;    // company they work at
  yourName: string;         // sender's name
  whyReachingOut: string;   // a paragraph explaining the context/motivation
}

export interface GeneratedEmail {
  id: string;               // stable key for React list
  patternLabel: string;     // human-readable pattern name
  patternDescription: string;
  subject: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Pull the first name from a possibly full-name string. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

/**
 * Condense a long "why reaching out" paragraph to 1–2 short sentences
 * suitable for in-line use. Keeps the first two sentences.
 */
function condensed(text: string): string {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 2).join(" ");
}

/**
 * Extract a plausible role signal from the "why" paragraph.
 * Returns e.g. "software engineering" or falls back to generic.
 */
function inferRoleArea(text: string): string {
  const lower = text.toLowerCase();
  const hints: [RegExp, string][] = [
    [/product\s*manage/i, "product management"],
    [/data\s*(science|engineer|analyst)/i, "data"],
    [/machine\s*learn|ml\b|ai\b/i, "ML / AI"],
    [/backend|back.end/i, "backend engineering"],
    [/frontend|front.end/i, "frontend engineering"],
    [/full.?stack/i, "full-stack engineering"],
    [/mobile|ios|android/i, "mobile development"],
    [/design|ux\b|ui\b/i, "design"],
    [/market(ing)?/i, "marketing"],
    [/finance|investment|banking/i, "finance"],
    [/research/i, "research"],
    [/software|engineer|swe|dev/i, "software engineering"],
    [/intern/i, "internship opportunities"],
  ];
  for (const [re, label] of hints) {
    if (re.test(lower)) return label;
  }
  return "your team's work";
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

function shortCurious(inputs: ColdEmailInputs): GeneratedEmail {
  const { targetName, targetCompany, yourName, whyReachingOut } = inputs;
  const tFirst = firstName(targetName);
  const yFirst = firstName(yourName);
  const area = inferRoleArea(whyReachingOut);
  const ctx = condensed(whyReachingOut);

  const subject = `${yFirst} — curious about ${area} at ${targetCompany}`;

  const body = `Hi ${tFirst},

${ctx}

${targetCompany} kept coming up as I dug into where the most interesting ${area} work is happening, and your name came up specifically — I wanted to reach out directly rather than apply blindly.

Would you be open to a 15-minute call sometime in the next few weeks? Happy to work around your calendar.

Thanks for reading,
${yourName}`;

  return {
    id: "short-curious",
    patternLabel: "Short & curious",
    patternDescription:
      "Brief, personal, easy to say yes to. Works best when you have a specific reason to contact this person.",
    subject,
    body,
  };
}

function valueFirst(inputs: ColdEmailInputs): GeneratedEmail {
  const { targetName, targetCompany, yourName, whyReachingOut } = inputs;
  const tFirst = firstName(targetName);
  const yFirst = firstName(yourName);
  const area = inferRoleArea(whyReachingOut);
  const ctx = condensed(whyReachingOut);

  const subject = `${targetCompany} + ${area} — ${yFirst} reaching out`;

  const body = `Hi ${tFirst},

I've been following ${targetCompany}'s work in ${area} and wanted to reach out before applying to any open roles.

${ctx}

I think there's a real match between what I'm building toward and the direction ${targetCompany} is heading — I'd love to hear how the team thinks about hiring for ${area} roles, and what experience actually moves the needle for candidates.

If you're open to a brief chat — even 10 minutes — I'd really appreciate it. No pressure if not.

Best,
${yourName}`;

  return {
    id: "value-first",
    patternLabel: "Value-first",
    patternDescription:
      "Lead with demonstrated interest in their specific work. Signals genuine research, not a blast email.",
    subject,
    body,
  };
}

function askForAdvice(inputs: ColdEmailInputs): GeneratedEmail {
  const { targetName, targetCompany, yourName, whyReachingOut } = inputs;
  const tFirst = firstName(targetName);
  const area = inferRoleArea(whyReachingOut);
  const ctx = condensed(whyReachingOut);

  const subject = `Advice on breaking into ${area}? — from a student`;

  const body = `Hi ${tFirst},

I'm a student trying to break into ${area}, and your career path at ${targetCompany} is one of the clearest examples I've found of someone doing it well.

${ctx}

I'm not asking for a referral or anything like that — I'm mostly trying to understand what skills or experiences you'd prioritize if you were starting over. Even a few sentences over email would be genuinely helpful.

Thanks for considering it,
${yourName}`;

  return {
    id: "ask-for-advice",
    patternLabel: "Ask-for-advice",
    patternDescription:
      "Lowest-friction ask. People are much more likely to respond to a genuine question than a job request.",
    subject,
    body,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate all three cold email templates from the given inputs. */
export function generateColdEmails(inputs: ColdEmailInputs): GeneratedEmail[] {
  return [
    shortCurious(inputs),
    valueFirst(inputs),
    askForAdvice(inputs),
  ];
}

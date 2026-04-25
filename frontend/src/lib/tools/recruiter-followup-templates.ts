/**
 * Recruiter follow-up email generator for /tools/recruiter-followup-generator.
 *
 * Pure heuristics — no AI, no I/O, deterministic.
 * Three patterns:
 *   1. post-application  — polite 5-day nudge after applying
 *   2. post-interview    — thank-you within 24h of interview
 *   3. ghosted-nudge     — gracious re-engage after 14 days of silence
 *
 * All inputs are validated at the call site (UI layer).
 * Each template fills real user inputs, not left-bracket placeholders.
 */

export type FollowUpPattern =
  | "post-application"
  | "post-interview"
  | "ghosted-nudge";

export interface FollowUpInputs {
  yourName: string;       // sender's full name
  recruiterName: string;  // recruiter's first or full name
  roleTitle: string;      // e.g. "Software Engineering Intern"
  company: string;        // e.g. "Stripe"
  detail: string;         // optional: interview topic / company note / mutual contact
}

export interface FollowUpEmail {
  id: string;
  pattern: FollowUpPattern;
  patternLabel: string;
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

/** Return detail sentence if present, else empty string. */
function detailLine(detail: string): string {
  const d = detail.trim();
  if (!d) return "";
  // Ensure it ends with a period
  return d.endsWith(".") || d.endsWith("!") || d.endsWith("?") ? d : `${d}.`;
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

function postApplication(inputs: FollowUpInputs): FollowUpEmail {
  const { yourName, recruiterName, roleTitle, company, detail } = inputs;
  const rFirst = firstName(recruiterName);
  const extraLine = detailLine(detail);

  const subject = `Quick follow-up on the ${roleTitle} role at ${company}`;

  const body = `Hi ${rFirst},

I applied for the ${roleTitle} position at ${company} about five days ago and wanted to follow up briefly.${extraLine ? `\n\n${extraLine}` : ""}

I'm genuinely excited about this role — ${company}'s work is exactly the kind of environment I'm looking for, and I think my background is a strong fit. Happy to share more if it would help move things along.

Thanks for your time,
${yourName}`;

  return {
    id: "post-application",
    pattern: "post-application",
    patternLabel: "Post-application nudge",
    patternDescription:
      "Sent ~5 days after submitting. Short and polite — just enough to surface your name without pressure.",
    subject,
    body,
  };
}

function postInterview(inputs: FollowUpInputs): FollowUpEmail {
  const { yourName, recruiterName, roleTitle, company, detail } = inputs;
  const rFirst = firstName(recruiterName);
  const extraLine = detailLine(detail);

  const subject = `Thank you — ${roleTitle} interview at ${company}`;

  const body = `Hi ${rFirst},

Thank you for taking the time to speak with me about the ${roleTitle} role at ${company}. I really enjoyed the conversation.${extraLine ? `\n\n${extraLine}` : ""}

The more I learn about the team and the work, the more excited I am about this opportunity. Please let me know if there's anything else I can provide on my end.

Thanks again,
${yourName}`;

  return {
    id: "post-interview",
    pattern: "post-interview",
    patternLabel: "Post-interview thank-you",
    patternDescription:
      "Sent within 24h of the interview. References one specific detail from the conversation to show you were listening.",
    subject,
    body,
  };
}

function ghostedNudge(inputs: FollowUpInputs): FollowUpEmail {
  const { yourName, recruiterName, roleTitle, company, detail } = inputs;
  const rFirst = firstName(recruiterName);
  const extraLine = detailLine(detail);

  const subject = `Re: ${roleTitle} at ${company} — still interested`;

  const body = `Hi ${rFirst},

I wanted to check in on the ${roleTitle} role at ${company} — it's been a couple of weeks and I hadn't heard back. I completely understand things get busy.${extraLine ? `\n\n${extraLine}` : ""}

I'm still very interested and happy to provide anything else you might need. If the role has moved in a different direction, no worries at all — I'd still appreciate a quick note either way.

Thanks,
${yourName}`;

  return {
    id: "ghosted-nudge",
    pattern: "ghosted-nudge",
    patternLabel: "Ghosted 2-week nudge",
    patternDescription:
      "Sent after 14 days of silence. Brief and gracious — maintains goodwill even if the answer is no.",
    subject,
    body,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate the follow-up email for the selected pattern. */
export function generateFollowUp(
  pattern: FollowUpPattern,
  inputs: FollowUpInputs
): FollowUpEmail {
  switch (pattern) {
    case "post-application":
      return postApplication(inputs);
    case "post-interview":
      return postInterview(inputs);
    case "ghosted-nudge":
      return ghostedNudge(inputs);
  }
}

/** Generate all three follow-up emails at once. */
export function generateAllFollowUps(inputs: FollowUpInputs): FollowUpEmail[] {
  return [
    postApplication(inputs),
    postInterview(inputs),
    ghostedNudge(inputs),
  ];
}

/** Human-readable labels and descriptions for each pattern (for UI tabs/pills). */
export const PATTERN_META: Record<
  FollowUpPattern,
  { label: string; description: string }
> = {
  "post-application": {
    label: "Post-application nudge",
    description: "~5 days after applying",
  },
  "post-interview": {
    label: "Post-interview thank-you",
    description: "Within 24h of interview",
  },
  "ghosted-nudge": {
    label: "Ghosted 2-week nudge",
    description: "After 14 days of silence",
  },
};

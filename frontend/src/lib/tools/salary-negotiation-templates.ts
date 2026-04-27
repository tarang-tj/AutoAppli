/**
 * Salary negotiation email templates for /tools/salary-negotiation-templates.
 *
 * Pure heuristics — no AI, no I/O, deterministic.
 * Three patterns:
 *   1. counter-offer        — politely propose a higher number with rationale
 *   2. multiple-offers      — disclose competing offer professionally
 *   3. ask-for-time         — request more time without losing the offer
 *
 * Brand stance: HONEST negotiation only.
 *   - No trash-talking competitors
 *   - No ultimatums
 *   - No false urgency
 *   - State facts; let the employer decide
 *
 * All inputs are validated at the call site (UI layer).
 * Each template fills real user inputs, not left-bracket placeholders.
 */

export type NegotiationPattern =
  | "counter-offer"
  | "multiple-offers"
  | "ask-for-time";

export interface NegotiationInputs {
  senderName: string;      // candidate's full name
  recruiterName: string;   // recruiter's first or full name
  roleTitle: string;       // e.g. "Software Engineering Intern"
  companyName: string;     // the company extending the offer
  currentOffer: number;    // USD, offered amount
  targetOffer: number;     // USD, desired amount
  competingOffer?: number; // USD, optional — used by multiple-offers pattern
  competingCompanyAnon?: boolean; // when true, hide competing company name
  decisionDeadlineDays?: number;  // optional — used by ask-for-time pattern
}

export interface NegotiationEmail {
  id: string;
  pattern: NegotiationPattern;
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

/** Format a USD number without cents: $85,000 */
function usd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Add N days to today, return formatted as "Month D, YYYY". */
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Template generators
// ---------------------------------------------------------------------------

function counterOffer(inputs: NegotiationInputs): NegotiationEmail {
  const { senderName, recruiterName, roleTitle, companyName, currentOffer, targetOffer } = inputs;
  const rFirst = firstName(recruiterName);

  const subject = `${roleTitle} offer — following up on compensation`;

  const body = `Hi ${rFirst},

Thank you for extending the offer for the ${roleTitle} position at ${companyName} — I'm genuinely excited about this opportunity and the team.

After reviewing the offer carefully, I wanted to discuss the base compensation. The offer is ${usd(currentOffer)}, and based on my research into market rates for this role and location, I was hoping we could explore ${usd(targetOffer)}. I believe this better reflects the value I'd bring and aligns with current benchmarks for similar roles.

I'm very enthusiastic about joining ${companyName} and confident we can find something that works for both of us. Would you be open to a brief call to discuss?

Thanks for your consideration,
${senderName}`;

  return {
    id: "counter-offer",
    pattern: "counter-offer",
    patternLabel: "Counter-offer",
    patternDescription: "Acknowledge the offer, propose a specific number, close warmly.",
    subject,
    body,
  };
}

function multipleOffers(inputs: NegotiationInputs): NegotiationEmail {
  const {
    senderName, recruiterName, roleTitle, companyName,
    currentOffer, targetOffer, competingOffer, competingCompanyAnon,
  } = inputs;
  const rFirst = firstName(recruiterName);

  const competingLine = competingOffer
    ? competingCompanyAnon
      ? `I've received a competing offer from another company at ${usd(competingOffer)}.`
      : `I've received a competing offer at ${usd(competingOffer)}.`
    : `I'm currently finalizing another offer at a higher compensation level.`;

  const subject = `${roleTitle} offer — compensation discussion`;

  const body = `Hi ${rFirst},

Thank you so much for the offer to join ${companyName} as ${roleTitle}. I'm very interested in this role and would genuinely prefer to be part of your team.

I want to be transparent with you: ${competingLine} My strong preference is ${companyName}, and I'm not using this to pressure you — I just want to have an honest conversation.

If you're able to get closer to ${usd(targetOffer)}, I would accept without hesitation. I understand compensation decisions involve multiple factors, and I'm open to discussing other elements of the package as well.

Thank you for considering this — I'm looking forward to your thoughts.

Best,
${senderName}`;

  return {
    id: "multiple-offers",
    pattern: "multiple-offers",
    patternLabel: "Multiple-offers leverage",
    patternDescription: "Disclose a competing offer honestly; reaffirm preference for this role.",
    subject,
    body,
  };
}

function askForTime(inputs: NegotiationInputs): NegotiationEmail {
  const {
    senderName, recruiterName, roleTitle, companyName,
    decisionDeadlineDays,
  } = inputs;
  const rFirst = firstName(recruiterName);
  const days = decisionDeadlineDays ?? 7;
  const extendedDate = addDays(days);

  const subject = `${roleTitle} offer — request for a brief extension`;

  const body = `Hi ${rFirst},

Thank you so much for the offer for the ${roleTitle} role at ${companyName}. I'm very excited about this opportunity and appreciate the team's time throughout the process.

I'm currently finalizing one or two other conversations, and I want to be thorough and fair to everyone involved. Would it be possible to extend the decision deadline to ${extendedDate}? I don't anticipate needing that long, but I want to give you an honest timeline.

This doesn't reflect any hesitation about ${companyName} — I'm genuinely enthusiastic about the role and the team. I just want to make a fully informed decision.

Thank you for understanding, and please let me know if this timeline works for you.

Best,
${senderName}`;

  return {
    id: "ask-for-time",
    pattern: "ask-for-time",
    patternLabel: "Ask for more time",
    patternDescription: "Request a deadline extension gracefully without signaling cold feet.",
    subject,
    body,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate the negotiation email for the selected pattern. */
export function generateNegotiation(
  pattern: NegotiationPattern,
  inputs: NegotiationInputs
): NegotiationEmail {
  switch (pattern) {
    case "counter-offer":
      return counterOffer(inputs);
    case "multiple-offers":
      return multipleOffers(inputs);
    case "ask-for-time":
      return askForTime(inputs);
  }
}

/** Generate all three negotiation emails at once. */
export function generateAllNegotiations(inputs: NegotiationInputs): NegotiationEmail[] {
  return [
    counterOffer(inputs),
    multipleOffers(inputs),
    askForTime(inputs),
  ];
}

/** Human-readable labels and descriptions for each pattern (for UI tabs/pills). */
export const NEGOTIATION_PATTERN_META: Record<
  NegotiationPattern,
  { label: string; description: string }
> = {
  "counter-offer": {
    label: "Counter-offer",
    description: "Propose a specific higher number",
  },
  "multiple-offers": {
    label: "Multiple offers",
    description: "Leverage a competing offer honestly",
  },
  "ask-for-time": {
    label: "Ask for time",
    description: "Request a deadline extension",
  },
};

/**
 * redactPII — strip email, phone, street-address, SSN patterns from a string
 * so server logs don't accumulate candidate PII on error paths.
 *
 * Use:
 *   console.error("route error:", redactPII(err instanceof Error ? err.message : String(err)));
 *   console.error("payload:", redactPII(JSON.stringify(body)));
 */
export function redactPII(input: unknown): string {
  if (input == null) return "";
  let s = typeof input === "string" ? input : String(input);

  // Email
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>");
  // US/CA phone
  s = s.replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "<phone>");
  // Streets (best-effort)
  s = s.replace(
    /\b\d+\s+[A-Za-z][A-Za-z0-9.\s]*\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Ct|Court|Pl|Place|Way|Hwy|Highway)\b\.?/gi,
    "<street>",
  );
  // SSN-ish (US)
  s = s.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "<ssn>");

  return s;
}

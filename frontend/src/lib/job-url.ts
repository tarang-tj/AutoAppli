/**
 * Normalize user-entered job posting URLs so links work without requiring a scheme in the input.
 * Accepts e.g. "acme.com/careers/123", "//acme.com/jobs", and keeps mailto:/tel: as-is.
 */
export function normalizeJobUrl(raw: string | null | undefined): string | undefined {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return undefined;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s;
  if (/^(mailto|tel|sms):/i.test(s)) return s;
  return `https://${s}`;
}

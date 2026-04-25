/**
 * URL helpers for the iCal deadline export.
 *
 * Two modes a calendar app cares about:
 *   - One-time download: a regular HTTPS URL with the .ics body, opened
 *     by `<a href download>`.
 *   - Subscription:      the same URL but with the `webcal://` scheme.
 *     macOS / iOS Calendar, Outlook, Google Calendar (via "Add by URL")
 *     all recognise it and re-fetch periodically.
 */

import { getSiteUrl } from "@/lib/site";

const ENDPOINT_PATH = "/api/v1/export/deadlines.ics";

/**
 * Returns a URL suitable for an `<a href download>` anchor.
 *
 * In the browser we keep the path relative so the request hits the same
 * origin (Next.js will rewrite to the backend if needed). On the server
 * (or whenever an absolute URL is preferred) we resolve via getSiteUrl.
 */
export function getDeadlinesDownloadUrl(): string {
  return ENDPOINT_PATH;
}

/**
 * Returns a `webcal://` URL the user can click to subscribe in their
 * calendar app of choice.
 *
 * webcal:// is the iCal subscription scheme. We strip whatever scheme
 * `getSiteUrl()` returned and prepend `webcal://`. localhost is allowed
 * (calendar apps will still try to subscribe; useful for dev).
 */
export function getDeadlinesWebcalUrl(): string {
  const base = getSiteUrl();
  // getSiteUrl returns either http://localhost:3000 or https://<host>.
  // Strip the scheme and any trailing slash, then prepend webcal://.
  const hostAndPath = base.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return `webcal://${hostAndPath}${ENDPOINT_PATH}`;
}

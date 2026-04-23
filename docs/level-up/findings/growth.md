# Findings — Growth (SEO, AI Quality, PDF, Integrations)

_Severity: **HIGH** > **MED** > **LOW**. ✅ = spot-checked against source._

## Summary

The highest-leverage growth moves are content (a blog) and AI quality evals — both build moats that compound. The biggest immediate quality risk is PDF ingest: `resume_parser.py` is 12 lines with no OCR fallback, which silently fails on a meaningful share of real-world resumes. Prompt routes work today but are unversioned, unevaluated, and leak user PII into server logs on error.

## Findings

### [HIGH] PDF extraction has no OCR fallback ✅
- **Where:** `backend/app/services/resume_parser.py` (12 lines total)
- **Impact:** scanned PDFs, image-exported resumes, form-filled template PDFs → empty string, user gets garbage tailored resume.
- **Fix:** Roadmap 1.7. pypdf first; if < 200 chars extracted, fall back to Tesseract via `pdf2image` + `pytesseract`. Surface `extraction_method` flag.
- **Effort:** M

### [HIGH] No prompt versioning or eval harness
- **Where:** prompts live inline in `frontend/src/app/api/ai/*/route.ts` and `backend/app/prompts/*.py`. No version string. No registry.
- **Impact:** every prompt change is a YOLO. Cannot A/B, cannot roll back cleanly, cannot tell if Claude 4.7 is better or worse than 4.6 on real inputs.
- **Fix:** Roadmap 2.2 and ADR-0003. Named/versioned prompts, eval harness, feedback endpoint, compare tool.
- **Effort:** L

### [HIGH] AI routes leak user PII into server logs on error
- **Where:** `frontend/src/app/api/ai/tailor-resume/route.ts:40` — `console.error("tailor-resume error:", err)` will pull full request body into Vercel logs on throw.
- **Impact:** resume text, contact info, interview notes in production logs. GDPR exposure.
- **Fix:** Roadmap 1.8. `redactPII` utility that strips email/phone/address before logging. Use error codes, not raw messages.
- **Effort:** S

### [MED] Extension parsers fail silently when DOM changes
- **Where:** `extension/parsers/*.js` (lever, linkedin, indeed, greenhouse)
- **Impact:** LinkedIn redesigns monthly; your parser quietly returns null title; user bookmarks empty job cards.
- **Fix:** Roadmap 2.4. Telemetry endpoint, fallback chain, low-confidence flag.
- **Effort:** M

### [MED] No JSON-LD structured data
- **Where:** `frontend/src/app/layout.tsx`
- **Impact:** no rich results, no "SoftwareApplication" card in search.
- **Fix:** Roadmap 2.6. One `<script type="application/ld+json">` in root layout.
- **Effort:** S

### [MED] Sitemap is hardcoded static list
- **Where:** `frontend/src/app/sitemap.ts` (if present) — static routes only.
- **Impact:** when content launches, indexing is blind.
- **Fix:** Roadmap 2.1 adds blog routes to the sitemap.
- **Effort:** S

### [MED] No per-route `generateMetadata`
- **Where:** each `page.tsx` falls back to the root template.
- **Impact:** dashboard, resume, jobs all share one title. Link previews and tab titles all say "AutoAppli".
- **Fix:** Roadmap 2.6.
- **Effort:** S

### [MED] Cover letter + interview prep prompts don't use structured outputs
- **Where:** `frontend/src/app/api/ai/{cover-letter,interview-prep}/route.ts`
- **Impact:** manual JSON cleaning logic with a fallback to hardcoded dummies. 5-10% of generations show fallbacks.
- **Fix:** Anthropic's `json_schema` mode (when supported) or tool-use with a structured schema.
- **Effort:** M

### [MED] No AI feedback loop
- **Where:** no `/api/ai/feedback` endpoint; no ratings in UI after generation.
- **Impact:** flying blind on quality. Can't tell a prompt regression from a model regression.
- **Fix:** Roadmap 2.2 ships this as part of the eval framework.
- **Effort:** M

### [MED] Adzuna search has no rate-limit handling
- **Where:** `frontend/src/app/api/search/route.ts`
- **Impact:** users hammering the search button hit Adzuna 429s that surface as "no results". Eventually IP ban.
- **Fix:** request dedup by query hash, exponential backoff on 429, surface a distinct "rate limited" UI state.
- **Effort:** S

### [MED] Match scoring is TF-IDF-only; doesn't use `remote_preference` bonus
- **Where:** `backend/app/services/match_service.py`
- **Impact:** `remote_preference` was added to the schema specifically to feed match scoring (per CLAUDE.md: +8 exact, +3 overlap, -6 opposite) — but isn't consumed.
- **Fix:** Roadmap 2.3. Add the bonus now; consider semantic embedding hybrid as the larger move.
- **Effort:** S (bonus only); L (semantic hybrid)

### [MED] No content marketing surface area
- **Where:** no `/blog`, no `/resources`, no `/guides`.
- **Impact:** zero organic traffic from long-tail queries. Every user comes from paid or referral.
- **Fix:** Roadmap 2.1. Ten pillar posts seeded.
- **Effort:** L

### [LOW] No dynamic OG image per shared link
- **Where:** `frontend/src/app/opengraph-image.tsx` at root only.
- **Fix:** Roadmap 2.7.
- **Effort:** S

### [LOW] No AbortController on AI calls
- **Where:** all AI route fetches in frontend.
- **Impact:** user navigates away → Claude call still runs → wasted tokens.
- **Fix:** Roadmap 2.9.
- **Effort:** S

### [LOW] Job data never refreshed after initial scrape
- **Where:** extension captures once; no `last_scraped_at` or refresh UI.
- **Impact:** tailoring against a 1-month-old JD when the posting has been updated.
- **Fix:** add `last_scraped_at`, "refresh" button, warn if > 14 days.
- **Effort:** S

## Quick wins

Roadmap 1.8, 2.6, 2.7, 2.9, and the `remote_preference` bonus.

## Strategic bets

- **2.1 Content + SEO** — compounds over months.
- **2.2 Prompt versioning + evals** — unlocks data-driven product.
- **2.3 Semantic match scoring** — visible quality jump for users.
- **2.4 Parser telemetry** — stops silent regressions that kill retention.

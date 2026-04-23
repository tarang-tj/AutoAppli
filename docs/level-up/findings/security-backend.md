# Findings — Security + Backend Hardening

_All file paths are relative to repo root. Severity: **CRIT** > **HIGH** > **MED** > **LOW**._
_Items marked ✅ were spot-checked against the source before publishing._

## Summary

Functional auth via Supabase JWT, but three exploitable weaknesses (unauth AI routes, JWT audience escape hatch, SSRF in scraper) plus systematic absence of rate limiting and a too-permissive response-header posture. Memory-mode user isolation is weak, but memory mode should be dev-only — the real risk is shipping a misconfigured prod without Supabase.

## Findings

### [CRIT] AI routes have no auth and no rate limit ✅
- **Where:** `frontend/src/app/api/ai/{tailor-resume,cover-letter,interview-prep,outreach,review-resume,thank-you}/route.ts`
- **Evidence:** `tailor-resume/route.ts:4` defines `POST` that reads body, calls `generateText`, returns result. Zero session check. No rate limit middleware.
- **Risk:** anyone who discovers these URLs can burn arbitrary Anthropic budget. One user, bad intent, on a home broadband connection can rack four-figure bills overnight.
- **Fix:** see Roadmap 0.1. Auth via Supabase session on each route + per-user token bucket in Supabase or Upstash.
- **Effort:** M (6 routes × 30min each)

### [CRIT] JWT audience validation has an escape hatch ✅
- **Where:** `backend/app/deps/jobs_auth.py:27-33`
- **Evidence:** `except jwt.InvalidAudienceError: payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], options={"verify_aud": False})`
- **Risk:** any token signed with the correct secret is accepted regardless of audience. If the Supabase JWT secret is ever reused across projects or leaked, cross-project token reuse succeeds.
- **Fix:** Roadmap 0.2. Delete the handler, let `InvalidAudienceError` propagate.
- **Effort:** S

### [CRIT] SSRF in `scrape_job_details` ✅
- **Where:** `backend/app/services/scraper_service.py:48-58` and `:116-118`
- **Evidence:** `async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True) as client: resp = await client.get(url)`. `url` is user-controlled. No scheme check, no host check, `follow_redirects=True`.
- **Risk:** authenticated user POSTs a job with URL `http://169.254.169.254/latest/meta-data/` and the backend returns the response body. Works against AWS metadata, internal databases, Kubernetes API — anything reachable from the backend's network.
- **Fix:** Roadmap 0.4. Hostname allowlist, `follow_redirects=False`, content-type check.
- **Effort:** S

### [HIGH] Memory-mode stores have no user isolation ✅
- **Where:** `backend/app/repositories/jobs_memory.py`, `user_session_memory.py`
- **Evidence:** Module-level `_jobs` dict, no per-user keying.
- **Risk:** a prod deploy with Supabase accidentally unset shows all users' data to all users. Memory mode is labeled as "demo" but the failsafe doesn't exist.
- **Fix:** refactor to key by `user_id`. Or — simpler — assert at startup that Supabase is configured when `ENV=production`.
- **Effort:** M

### [HIGH] No backend rate limiting
- **Where:** `backend/app/main.py`, all routers
- **Evidence:** No middleware, no `slowapi`, no counter.
- **Risk:** authenticated attacker can fill Supabase tables (100k row free-tier cap) or DOS the server with parallel requests.
- **Fix:** Roadmap 1.3. `slowapi` per-user limits, stricter on AI/search endpoints.
- **Effort:** M

### [HIGH] No CSP, no HSTS
- **Where:** `frontend/next.config.ts`
- **Evidence:** current headers only set `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`.
- **Risk:** stored XSS via an unsanitized job description (if any surface renders it as HTML) has no second line of defense.
- **Fix:** Roadmap 1.5.
- **Effort:** S

### [HIGH] Prompt injection has no structural mitigation
- **Where:** `backend/app/prompts/resume_prompt.py`, `outreach_prompt.py`, all `api/ai/*/route.ts`
- **Evidence:** prompts interpolate user content (`f"Resume:\n{resume_text}"`) directly into the system context with no delimiter.
- **Risk:** low today (Claude is robust), but any future change that lets the model trigger tools on behalf of the user makes this a real vector.
- **Fix:** Roadmap 1.8. Wrap in XML tags. Pair with `redactPII()` on log output.
- **Effort:** S

### [MED] `ProfilePatch` schema drift → data loss ✅
- **Where:** `backend/app/models/schemas.py:118-121`
- **Evidence:** Only `display_name`, `headline`, `linkedin_url`. CLAUDE.md claims it should also include `phone, location, portfolio_url, bio, remote_preference`. Migration `20260416120000_profile_remote_preference.sql` added the DB column.
- **Risk:** in FastAPI mode, any PATCH with the extended fields silently drops them. Frontend thinks it saved; user sees the data gone after refresh.
- **Fix:** Roadmap 0.3. Add fields, add `ConfigDict(extra="forbid")` so future drift 422s loudly.
- **Effort:** S

### [MED] Pydantic `extra="ignore"` across response schemas
- **Where:** `backend/app/models/schemas.py` — several `ConfigDict(extra="ignore")` on AI response models.
- **Risk:** if Anthropic's response grows a field you care about, you silently drop it. No error, no log.
- **Fix:** Roadmap 1.9. Flip to `"forbid"` and explicitly allow what you use.
- **Effort:** S

### [MED] CORS is config-driven with no validation
- **Where:** `backend/app/config.py:21`, `main.py:11-17`
- **Risk:** `CORS_ORIGINS=*` in a `.env.production` file is a footgun. No startup check to reject it.
- **Fix:** validator on Settings that rejects `*` when `DEBUG=False`.
- **Effort:** S

### [MED] Scraper doesn't sanitize HTML before storing
- **Where:** `scraper_service.py:60` (`BeautifulSoup(resp.text, "html.parser")` → extracted description stored as-is)
- **Risk:** a malicious job posting with inline JS or event handlers survives extraction via BS's text methods, but any future code that renders the description as `dangerouslySetInnerHTML` inherits the XSS.
- **Fix:** run through `bleach` on write, stripping all tags to text. Store a separate `description_html` only when you explicitly want markup.
- **Effort:** S

### [MED] Env vars validated lazily
- **Where:** `backend/app/config.py`
- **Risk:** `ANTHROPIC_API_KEY=""` lets the app boot healthily. First AI request 500s cryptically.
- **Fix:** Pydantic `@field_validator` that raises if empty when required.
- **Effort:** S

### [LOW] No structured logging / audit trail
- **Where:** all routers
- **Risk:** can't investigate account compromise, can't measure abuse.
- **Fix:** `structlog` with request-id middleware. See Roadmap 2.10.
- **Effort:** M

### [LOW] `.env.local` may be in git history
- **Where:** `frontend/.env.local` is correctly gitignored but existed before `.gitignore` was added, possibly.
- **Risk:** anon key + Adzuna key leak if ever committed.
- **Fix:** Roadmap 0.5. Run `git log --all -- frontend/.env.local`, rotate if it appears.
- **Effort:** S to verify; S-M to remediate.

## Quick wins

Roadmap items 0.1 through 0.5 and 1.5, 1.8, 1.9.

## Strategic bets

- Rate-limiting architecture (ADR-0004).
- Observability foundation (Roadmap 2.10).
- If memory-mode is real, a proper `JobRepository` protocol with per-user isolation tests.

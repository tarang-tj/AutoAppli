# ADR-0004: Rate limiting and abuse prevention

**Status:** Accepted (Phase 1 shipped 2026-04-23 as part of level-up v3 commits B1 + B2).
**Date:** 2026-04-23

## Context

Three surfaces with no limits today:

1. Frontend AI routes (`frontend/src/app/api/ai/*`) — unauthenticated, unlimited. Anthropic bill exposure.
2. Backend FastAPI endpoints — no per-user or per-IP cap.
3. Adzuna search proxy — no dedup, no backoff.

Phase 0 item 0.1 and Phase 1 item 1.3 ship the controls. This ADR picks the mechanism.

## Options

### A. Upstash Redis token bucket

- Serverless Redis. Per-user counter keyed by `user_id + bucket`.
- Sub-10ms latency.
- Free tier: 10k commands/day.

**Pros:** purpose-built, atomic INCR, TTL.
**Cons:** external dep.

### B. Supabase counter table + RPC

- `ai_usage(user_id, bucket_minute, calls)` with a Postgres function that atomically increments and returns.
- One fewer provider.

**Pros:** no new infra. RLS secures it.
**Cons:** DB roundtrip on every AI call. At scale, hot-path hits add cost.

### C. In-memory bucket (single-instance only)

- FastAPI `slowapi` or `fastapi-limiter` with in-process state.

**Pros:** zero infra.
**Cons:** doesn't work across Vercel/Render horizontal scaling. Ruled out for prod.

### D. Vercel Edge Config + KV

- Vercel-native. Edge-fast.

**Pros:** tight Next.js integration.
**Cons:** pricing beyond the hobby tier adds up; vendor lock.

## Recommendation

Combine B and A strategically:

- **Backend FastAPI limits** → option B (Supabase counter). Low request volume, shared infra.
- **Frontend AI routes** → option A (Upstash). High request volume, user-facing, speed matters.
- **Adzuna search** → in-memory dedup cache (option C) is enough because each Next.js function invocation reuses state within its warm window. Augment with a Supabase counter for daily caps.

Concrete limits (v1):

| Surface | Route | Limit | Window | Key |
|---|---|---|---|---|
| AI generation | tailor-resume, cover-letter, outreach | 10 | per hour | user_id |
| AI read | review-resume, interview-prep, thank-you | 30 | per hour | user_id |
| AI global | any `/api/ai/*` | 50 | per day | user_id |
| Backend read | GET /jobs, /profile | 200 | per hour | user_id |
| Backend write | POST/PATCH/DELETE | 60 | per hour | user_id |
| Search | POST /search | 30 | per hour | user_id |
| Anonymous | any endpoint | 20 | per hour | IP |

All 429s return `Retry-After` and a machine-readable `X-RateLimit-Reset`.

Include an admin-bypass header (signed with a secret) for synthetic monitoring.

## Consequences

- **Positive:** bounded Anthropic bill. No accidental DoS.
- **Negative:** legitimate heavy users hit limits. Ship with observability (Sentry event on 429) so you can tune.

## Decision

Pending. Owner: @tarang-tj.

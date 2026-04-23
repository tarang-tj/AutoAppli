# ADR-0005: Match scoring — TF-IDF, semantic, or hybrid

**Status:** Draft.
**Date:** 2026-04-23

## Context

Today match scoring is implemented **twice**:

- `frontend/src/lib/api.ts::computeDemoMatchScore` — TF-IDF with ~40 hardcoded skill terms.
- `backend/app/services/match_service.py::compute_match_score` — TF-IDF with ~60 hardcoded skill terms.

Scores diverge between the two implementations. Users get different numbers depending on which path is live.

Separately, the scoring is purely lexical. "Kubernetes" and "container orchestration" are a zero match despite being synonymous for most purposes. `remote_preference` is stored but not consumed in scoring.

## Options

### A. Keep TF-IDF, unify on the backend

- Delete the TS implementation.
- Always call `POST /match/scores`.
- Add the `remote_preference` bonus (+8 / +3 / -6 per CLAUDE.md).

**Pros:** lowest lift, lowest latency, deterministic.
**Cons:** still misses semantic matches. Quality ceiling is low.

### B. Swap to semantic embeddings

- Embed resume + job description with Voyage AI or Cohere (both cheaper than Claude for embeddings).
- Store in Supabase pgvector.
- Score = cosine similarity × 100.

**Pros:** captures semantic equivalence. Better UX.
**Cons:** paid API on every resume and every job. Embedding cost + storage. Black box — hard to explain "why 73".

### C. Hybrid: weighted combination

- 0.6 × cosine(embeddings) + 0.3 × TF-IDF + 0.1 × remote_preference_bonus.
- TF-IDF contribution keeps "exact skill match" weighted.
- Weights tuned on a labeled dataset.

**Pros:** captures both signals, TF-IDF anchor protects against embedding failures on niche jargon.
**Cons:** most complex. Two subsystems to maintain.

## Recommendation

**Phased: A now, C later.**

- Phase 1 (Week 3-4): Option A. Delete TS scoring, add `remote_preference` bonus, unify on backend.
- Phase 2 (Month 2-3): Option C. Add pgvector migration. Embed resumes on upload, jobs on scrape. Backfill existing rows in a cron job. Ship a hybrid scorer. Include an `explanation` field in the response: "Strong match on Kubernetes, Docker, AWS. Remote preference aligned."

Skip B because pure semantic without the lexical anchor tends to produce false positives for vague job descriptions.

## Test vectors

Before shipping Phase 2, build a small labeled dataset:

- 20 (resume, job) pairs where the user manually labeled as {strong, medium, weak} match.
- Score with A, B, and C.
- Expectation: C outperforms A on the medium-match pairs (semantic rescue) and ties on strong/weak.

## Consequences

- **Positive:** removes the TS/Python drift forever. Quality improvement visible to users.
- **Negative:** pgvector + embedding API is new infra. Backfill is non-trivial for existing users.

## Decision

Pending. Owner: @tarang-tj.

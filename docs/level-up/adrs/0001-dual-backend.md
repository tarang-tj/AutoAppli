# ADR-0001: Dual-backend (FastAPI + Supabase-direct) — commit or deprecate

**Status:** Draft — needs decision before Phase 1 item 1.4.
**Date:** 2026-04-23

## Context

AutoAppli runs in two architectural modes, toggled by the presence of `NEXT_PUBLIC_API_URL`:

1. **FastAPI mode** — the Next.js frontend calls `/api/v1/*` on a deployed FastAPI backend. The backend owns business logic, enforces authz, and talks to Supabase via the service-role key.
2. **Supabase-direct mode** — `NEXT_PUBLIC_API_URL` is unset. The frontend talks directly to Supabase via the anon key, trusting Row-Level Security to enforce authz. `frontend/src/lib/api.ts` routes every request through a fallback branch.

`CLAUDE.md` claims "many production deployments run without a FastAPI host" and that Supabase-direct is "real". The codebase treats it as a first-class citizen in `api.ts` but as an afterthought elsewhere — evidenced by `ProfilePatch` schema drift (Phase 0 item 0.3), duplicated match scoring (Phase 1 item 1.6), and missing cover-letter-history / resumes-generated endpoints in Supabase-direct mode.

## Forces

- **For committing to dual-mode:**
  - Reduces hosting cost — a solo/side-project user can run on Vercel + Supabase free tier with no backend.
  - Good for demo / single-user deployments.
  - `api.ts` already has the scaffolding; deleting it loses real code.

- **For deprecating Supabase-direct:**
  - Every feature is two implementations. Drift is the norm, not the exception.
  - RLS is a blunt instrument — business logic like "only move a job to Offer stage if salary is set" can't live in RLS.
  - AI routes (`/api/ai/*`) already require a Node runtime, so "no backend" is a fiction — Next.js server actions ARE the backend.
  - Memory-mode repositories in `backend/app/repositories/*_memory.py` have no user isolation and would leak data in a misconfigured prod.

## Options

### A. Commit to dual-mode as first-class

- Define `Repository` protocols for every domain.
- Mirror every FastAPI endpoint as a Supabase RPC or direct-query helper in `api.ts`.
- Mandatory CI: every new endpoint requires both implementations + tests for both paths.
- Share match-scoring logic via WebAssembly (compile Python to wasm) or re-implement once in TS and call from Python via Pyodide. Both are overkill for the problem.

### B. Deprecate Supabase-direct, keep FastAPI

- Delete all fallback branches in `api.ts`.
- Require a FastAPI host in production. Document the simplest host (Fly.io, Render, Railway — each has a usable free tier).
- Retain Supabase for storage + RLS as defense-in-depth, not as the primary access path.
- Keep a thin demo mode that serves static fixture data (`demo-data.ts`) — no user data, no persistence.

### C. Deprecate FastAPI, go Supabase-only + Next.js API routes

- Merge all business logic into Next.js server actions / API routes.
- Port the Python services (`match_service`, `eval_service`, `analytics_service`) to TypeScript.
- Drop Pydantic in favor of Zod on the frontend (and stored procs in Postgres for heavy aggregation).
- Aggressive simplification; kills a language boundary; loses any Python-specific library advantage (e.g., pypdf, Tesseract bindings).

## Recommendation

**Option B.** The cost of maintaining dual-mode is paying dividends for a use case (no-backend demo) that should be a separate concern — served by a static fixture, not a parallel runtime path. Deleting the fallback tightens contracts, shrinks `api.ts` by an estimated 40%, and makes every remaining bug easier to diagnose.

Demo mode stays, but via a feature flag that swaps to `demo-data.ts` — not by silently falling back on a missing env var.

## Consequences

- **Positive:** one path to test, one contract to maintain, simpler onboarding.
- **Negative:** users without a deployed FastAPI lose access. Need to document a cheap host option.
- **Migration:** 2-3 week deprecation window. Next steps under Phase 1 item 1.4 change from "protocol for two impls" to "delete memory impl, keep supabase repo".

## Decision

Pending. Owner: @tarang-tj.

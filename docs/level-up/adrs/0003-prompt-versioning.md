# ADR-0003: AI prompt versioning and evaluation framework

**Status:** Draft.
**Date:** 2026-04-23

## Context

AutoAppli has six AI routes (`tailor-resume`, `cover-letter`, `interview-prep`, `outreach`, `review-resume`, `thank-you`) plus backend prompt builders (`resume_prompt`, `outreach_prompt`). All prompts are inline string literals. No version. No registry. No way to:

- A/B test a prompt change,
- Roll back a prompt regression,
- Tell if a worsening output is a prompt change or a model change,
- Correlate user feedback with a specific prompt,
- Produce a usable eval report.

`eval_service.py` has scaffolding for hallucination detection, keyword coverage, and change-delta — but it's not wired to prompt lineage.

## Options

### A. File-based prompt registry

- Prompts live in `backend/app/prompts/registry/<name>/<version>/prompt.md` + optional `schema.json`.
- Loaded at startup into an in-memory dict keyed by `(name, version)`.
- Each response carries `prompt_version` in the JSON payload.
- `ai_call_log` table stores `{user_id, prompt_name, prompt_version, model, input_tokens, output_tokens, eval_score, user_rating}`.

**Pros:** plain files, diffable in git, no external dep.
**Cons:** prompts + code move together, which is fine for a small team.

### B. External prompt management (Langfuse, Humanloop, PromptLayer)

- Prompts stored in a SaaS.
- Hot-reloadable without redeploy.

**Pros:** non-engineers can edit.
**Cons:** vendor lock-in, $$, latency added to every call.

### C. Supabase table for prompts

- `ai_prompts(id, name, version, system, user_template, schema_json, is_active)`
- RLS locks it down.

**Pros:** hot editing via SQL, no new infra.
**Cons:** prompts-in-DB makes git history useless for prompt evolution; diffs are lost.

## Recommendation

**Option A**, with the logging infrastructure (option A's log table) regardless of which prompt-storage option wins. The registry is a six-hour build. The log table + `/api/ai/feedback` endpoint is a day.

Structure:

```
backend/app/prompts/registry/
├── tailor_resume/
│   ├── v1/
│   │   ├── prompt.md         # system prompt with {{resume}} {{job}} placeholders
│   │   └── schema.json       # optional output JSON schema
│   ├── v2/
│   │   └── prompt.md         # current default
│   └── active.txt            # contents: "v2"
├── cover_letter/...
└── registry.py               # loader: PromptRegistry.get("tailor_resume", "v2") → Prompt
```

And:

```
# migration: supabase/migrations/NNNNNN_ai_call_log.sql
create table ai_call_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  prompt_name text not null,
  prompt_version text not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  eval_score jsonb,         -- { keyword_coverage: 82, hallucinations: 0, ... }
  user_rating int,          -- nullable, filled by /api/ai/feedback
  user_regenerated bool default false
);
create policy "own logs" on ai_call_log for select using (user_id = auth.uid());
```

And an internal-only route:

```
GET /admin/prompts/compare?prompt=tailor_resume&a=v1&b=v2&job_id=X
```

runs the same input through both versions and renders a diff + eval score side-by-side.

## Consequences

- **Positive:** every AI quality claim becomes testable. Prompt rollbacks are a one-line `active.txt` edit.
- **Negative:** +1 column to every AI response payload. Negligible cost.

## Decision

Pending. Owner: @tarang-tj.

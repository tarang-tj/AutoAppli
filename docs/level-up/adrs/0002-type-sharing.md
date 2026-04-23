# ADR-0002: Single source of truth for domain types

**Status:** Draft.
**Date:** 2026-04-23
**Depends on:** ADR-0001 (deprecating one backend shrinks the surface area).

## Context

`frontend/src/types/index.ts` and `backend/app/models/schemas.py` define the same domain types (Job, Resume, Profile, etc.) independently. Drift is caught only by users: the `ProfilePatch` missing-fields bug (Phase 0 item 0.3) is the canonical example.

## Options

### A. Pydantic → TypeScript codegen

- Pydantic v2 exposes `model_json_schema()`.
- Export all models as JSON Schema, pipe through `json-schema-to-typescript`.
- Generated types land in `frontend/src/types/generated/*.ts`.
- `types/index.ts` becomes frontend-only UI state types.

**Pros:** Python is the "backend truth", generation is one-way and cheap.
**Cons:** Pydantic JSON Schema has quirks (e.g., union discriminators, generics). Some manual tweaking.

### B. TypeScript → Pydantic codegen

- Reverse direction via `@pydantic/json-schema` or `datamodel-code-generator`.
- Ideal if most contracts are frontend-driven.

**Pros:** TypeScript-first teams prefer this.
**Cons:** the backend is the authoritative store; frontend types shouldn't drive schema evolution.

### C. Shared JSON Schema as the source

- Hand-written JSON Schema in `schemas/*.json`.
- Generate both TS and Python from there.
- Most vendor-neutral.

**Pros:** one source, no "winner" language.
**Cons:** yet another language to learn, hand-writing schemas is tedious, loses type-driven development ergonomics.

### D. Protobuf / buf.build

- Define `.proto`, generate TS + Python.
- Industry-standard for multi-language contracts.

**Pros:** best tooling, validated at scale.
**Cons:** overkill for a solo/small team. Tooling overhead.

## Recommendation

**Option A.** Pydantic is already the authority (it's where DB-shaped Supabase responses land). Generation is one-way, which is easy to reason about.

Concrete plan:

1. Add `pydantic-json-schema` (built into v2) + `json-schema-to-typescript` as dev deps.
2. `scripts/gen-types.sh` dumps each schema, runs `json2ts`, formats with prettier, writes to `frontend/src/types/generated/`.
3. Add a CI check: run `gen-types.sh`, `git diff --exit-code` — fails the build if generated types are stale.
4. Move existing `types/index.ts` entries that duplicate backend schemas into `generated/`. Keep UI-only types (e.g., `KanbanDragState`) in `index.ts`.

## Consequences

- **Positive:** schema drift is a type error at build time, not a production bug.
- **Negative:** Pydantic JSON Schema has edge cases — you'll hit at least one "why is this `| null` instead of `?`" issue. Budget an afternoon.

## Decision

Pending. Owner: @tarang-tj.

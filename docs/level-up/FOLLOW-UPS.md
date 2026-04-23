# Level-up — Follow-ups Not in the Nuclear Patch

Items below need more than a file edit. Each has a concrete next step.

## P0 — still-to-ship this week

### AI route auth + rate limiting (Phase 0.1)

**Why it's not in the patch:** needs a Supabase migration + RPC (or Upstash Redis) plus `@supabase/ssr` server-side session helper in each `/api/ai/*` route.

**Recipe:**

1. `supabase/migrations/20260424120000_ai_usage.sql`:
   ```sql
   create table if not exists ai_usage_log (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     user_id uuid references auth.users(id) not null,
     route text not null,
     model text,
     input_tokens int, output_tokens int, duration_ms int
   );
   create index if not exists ai_usage_log_user_time on ai_usage_log (user_id, created_at);
   alter table ai_usage_log enable row level security;
   create policy "own logs" on ai_usage_log for select using (user_id = auth.uid());

   create or replace function ai_rate_limit_check(
     p_user_id uuid, p_route text, p_max int, p_window_min int
   ) returns boolean language plpgsql as $$
   declare v_count int;
   begin
     select count(*) into v_count from ai_usage_log
      where user_id = p_user_id
        and route = p_route
        and created_at > now() - (p_window_min || ' minutes')::interval;
     return v_count < p_max;
   end $$;
   ```

2. In each `frontend/src/app/api/ai/*/route.ts`, before `generateText`:
   ```ts
   import { createServerClient } from '@supabase/ssr';
   import { cookies } from 'next/headers';

   const supabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     { cookies: await cookies() }
   );
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

   const { data: allowed } = await supabase.rpc('ai_rate_limit_check', {
     p_user_id: session.user.id,
     p_route: 'tailor-resume',
     p_max: 10,
     p_window_min: 60,
   });
   if (!allowed) return NextResponse.json({ error: "rate limited" }, { status: 429 });
   ```

3. After the Claude call succeeds, log usage:
   ```ts
   await supabase.from('ai_usage_log').insert({
     user_id: session.user.id,
     route: 'tailor-resume',
     model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
     duration_ms: Date.now() - t0,
   });
   ```

**Limits (v1):** 10/hour for generation, 30/hour for read-only, 50/day global, per user_id.

### Audit git history for accidentally-committed secrets (Phase 0.5)

```sh
git log --all --oneline -- frontend/.env.local
git log --all -p -- frontend/.env.local | head -80
```

If anything shows, rotate the Supabase anon key and the Adzuna key, then `git filter-repo --invert-paths --path frontend/.env.local`.

### Clean up repo root patch files (Phase 0.8)

```sh
mkdir -p patches/landed patches/archive
git mv *.patch patches/landed/ 2>/dev/null || true
git mv apply-*.sh patches/landed/ 2>/dev/null || true
git commit -m "chore: archive accumulated patch/apply files"
```

## P1 — quality foundations (next 2-3 weeks)

### PR-gating CI (Phase 1.1)

Create `.github/workflows/ci.yml` with three jobs (frontend build, backend pytest, migration lint). Add branch protection requiring all three pass.

### Backend rate limiting — slowapi (Phase 1.3)

```sh
echo 'slowapi>=0.1.9' >> backend/requirements.txt
pip install -r backend/requirements.txt
```

```python
# backend/app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address
def key_func(req):
    return req.headers.get("x-user-id") or get_remote_address(req)
limiter = Limiter(key_func=key_func)
app.state.limiter = limiter
# @limiter.limit("20/hour") on /resumes/generate, etc.
```

### Baseline test coverage (Phase 1.2)

```sh
echo 'pytest>=7.4.0\npytest-asyncio>=0.21.0' >> backend/requirements-dev.txt
pip install -r backend/requirements-dev.txt
cd frontend && npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Target: 60% coverage of `backend/app/services/`, key helpers in `frontend/src/lib/`. Start with match_service parity tests + jobs_auth tests.

### Repository protocol interfaces (Phase 1.4)

```python
# backend/app/repositories/_protocols.py
from typing import Protocol
class JobRepository(Protocol):
    def create_job(self, user_id: str, payload: dict) -> Job: ...
    def list_jobs(self, user_id: str) -> list[Job]: ...
    # ...
```

Annotate both `jobs_memory.py` and `jobs_supabase.py`. Mypy catches method drift.

### PDF OCR fallback (Phase 1.7)

Deploy host (Render/Fly) needs `apt-get install tesseract-ocr poppler-utils`. Then:

```sh
echo 'pytesseract>=0.3.10\npdf2image>=1.17.0' >> backend/requirements.txt
```

```python
# backend/app/services/resume_parser.py
import io, pypdf
from pdf2image import convert_from_bytes
import pytesseract

def extract_text_from_pdf(data: bytes) -> tuple[str, str]:
    text = ""
    try:
        text = "\n".join(p.extract_text() or "" for p in pypdf.PdfReader(io.BytesIO(data)).pages)
    except Exception:
        pass
    if len(text.strip()) < 200:
        images = convert_from_bytes(data, dpi=200)
        text = "\n".join(pytesseract.image_to_string(img) for img in images)
        return text, "ocr"
    return text, "text"
```

### Match scoring unification (Phase 1.6, ADR-0005)

Phase A: delete `computeDemoMatchScore` in `frontend/src/lib/api.ts`, always call `POST /match/scores`. Add `remote_preference` bonus (+8/+3/-6) to `backend/app/services/match_service.py`.

Phase B: swap to hybrid (0.6 × cosine embeddings + 0.3 × TF-IDF + 0.1 × remote bonus) via pgvector.

## P2 — growth & moat (month 2-3)

- **Content** (2.1): blog at `/blog` with 10 pillar posts. ~2-3 days of content work.
- **Prompt versioning + evals** (2.2, ADR-0003): `backend/app/prompts/registry/<name>/<version>/` + `ai_call_log` table + `/admin/prompts/compare` tool.
- **Semantic match** (2.3, ADR-0005): pgvector + Voyage/Cohere embeddings. Backfill for existing rows.
- **Parser telemetry** (2.4): extension logs selector hits to `/api/extension/parse-telemetry`.
- **Type codegen** (2.5, ADR-0002): Pydantic → TypeScript via `model_json_schema()` + `json-schema-to-typescript` in CI.
- **Kanban keyboard nav** (2.8): `@hello-pangea/dnd` has a keyboard preset; wire it up with arrow-key movement + Escape cancel.
- **Observability** (2.10): Sentry on both sides + `structlog` on backend with request-id middleware.


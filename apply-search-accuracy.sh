#!/usr/bin/env bash
# apply-search-accuracy.sh
#
# One-command rollout for the search-accuracy feature. Run from the repo
# root. Does the parts that are mechanical (verify files, run tests, run
# migration). The four wiring patches in SEARCH_ACCURACY_INTEGRATION.md
# need hand review and are not applied here.
set -euo pipefail

cd "$(dirname "$0")"

say() { printf "\033[1;34m▸ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

say "Verifying new files are in place"
required=(
  "frontend/src/lib/match/taxonomy.ts"
  "frontend/src/lib/match/types.ts"
  "frontend/src/lib/match/extract.ts"
  "frontend/src/lib/match/score.ts"
  "frontend/src/lib/match/adapters.ts"
  "frontend/src/lib/match/resume-parser.ts"
  "frontend/src/lib/match/saved-searches.ts"
  "frontend/src/lib/match/index.ts"
  "frontend/src/lib/match/README.md"
  "frontend/src/lib/match/__tests__/score.test.ts"
  "frontend/src/components/jobs/search-accuracy/fit-badge.tsx"
  "frontend/src/components/jobs/search-accuracy/smart-filters.tsx"
  "frontend/src/components/jobs/search-accuracy/apply-filters.ts"
  "backend/app/services/taxonomy.py"
  "backend/app/services/match_v2.py"
  "backend/app/services/ingestion/__init__.py"
  "backend/app/services/ingestion/base.py"
  "backend/app/services/ingestion/greenhouse.py"
  "backend/scripts/ingest.py"
  "backend/tests/test_match_v2.py"
  "backend/tests/test_ingestion_greenhouse.py"
  "supabase/migrations/20260417120000_search_accuracy.sql"
)
for f in "${required[@]}"; do
  [ -f "$f" ] || fail "Missing required file: $f"
done
say "All ${#required[@]} files present."

if [ -d frontend/node_modules ]; then
  say "Running frontend typecheck"
  (cd frontend && npm run typecheck) || warn "typecheck reported issues — inspect above"
  say "Running frontend lint"
  (cd frontend && npm run lint) || warn "lint reported issues — inspect above"
  if (cd frontend && npx --yes vitest --version >/dev/null 2>&1); then
    say "Running frontend match tests"
    (cd frontend && npx vitest run src/lib/match/__tests__/score.test.ts) \
      || warn "vitest suite reported failures"
  fi
else
  warn "frontend/node_modules not found — skipping JS checks. Run: (cd frontend && npm ci)"
fi

if command -v pytest >/dev/null 2>&1; then
  say "Running backend match + ingestion tests"
  pytest backend/tests/test_match_v2.py backend/tests/test_ingestion_greenhouse.py -v \
    || warn "pytest reported failures"
else
  warn "pytest not on PATH — skipping backend checks"
fi

say "Applying Supabase migration"
if command -v supabase >/dev/null 2>&1; then
  supabase db push || warn "supabase db push failed — run it manually once your creds are set"
else
  warn "Supabase CLI not installed. Run the migration manually:"
  echo "    psql \$DATABASE_URL -f supabase/migrations/20260417120000_search_accuracy.sql"
fi

say "Refreshing the codemap"
if [ -f "$HOME/.claude/skills/graphify/graphify.py" ]; then
  python3 "$HOME/.claude/skills/graphify/graphify.py" || warn "graphify failed"
else
  warn "graphify not installed — skipping codemap refresh"
fi

cat <<'EOF'

──────────────────────────────────────────────────────────────────────
 Mechanical rollout complete.

 Next (manual) steps — see SEARCH_ACCURACY_INTEGRATION.md:
  1. Wire scoreMatch into frontend/src/lib/api.ts :: computeDemoMatchScore
  2. Render FitBadge + SmartFilters in frontend/src/app/jobs/page.tsx
  3. (Optional) Swap backend/app/routers/match.py to use match_v2
  4. (Optional) Schedule python -m backend.scripts.ingest for nightly refresh

 Commit with:
  git add frontend/src/lib/match frontend/src/components/jobs/search-accuracy \
          backend/app/services/taxonomy.py backend/app/services/match_v2.py \
          backend/app/services/ingestion backend/scripts/ingest.py \
          backend/tests/test_match_v2.py backend/tests/test_ingestion_greenhouse.py \
          supabase/migrations/20260417120000_search_accuracy.sql \
          SEARCH_ACCURACY_INTEGRATION.md apply-search-accuracy.sh
  git commit -m "feat: search accuracy v2 — explainable scorer, smart filters, Greenhouse ingestion"
──────────────────────────────────────────────────────────────────────
EOF

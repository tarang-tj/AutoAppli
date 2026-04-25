-- 20260425160000_mock_interview_resume.sql
--
-- Adds questions_cache column to mock_interview_sessions so a user can
-- close the tab mid-session and resume from the right question.
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.
-- questions_cache stores the full ordered list of pre-planned questions
-- as a JSONB array of strings. NULL on sessions created before this
-- migration — those sessions degrade gracefully (questions regenerated
-- on resume).

alter table public.mock_interview_sessions
  add column if not exists questions_cache jsonb;

comment on column public.mock_interview_sessions.questions_cache is
  'Ordered JSON array of question strings. Persisted on session creation '
  'so users can resume mid-session and continue from the correct question. '
  'NULL on legacy sessions (pre-migration) — resume regenerates questions.';

notify pgrst, 'reload schema';

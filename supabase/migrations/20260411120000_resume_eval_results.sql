-- Resume eval results — stores quality scores for each tailored resume.
-- Linked to generated_documents so we can track eval trends over time.

CREATE TABLE IF NOT EXISTS public.resume_eval_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id text,  -- FK to generated_documents.id (text key)
    job_description_excerpt text DEFAULT '',

    -- Composite score (0-100)
    overall_score smallint NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),

    -- Keyword coverage
    keyword_score smallint NOT NULL DEFAULT 0 CHECK (keyword_score BETWEEN 0 AND 100),
    keywords_matched text[] DEFAULT '{}',
    keywords_missing text[] DEFAULT '{}',
    total_keywords smallint DEFAULT 0,

    -- Hallucination check
    hallucination_score smallint NOT NULL DEFAULT 100 CHECK (hallucination_score BETWEEN 0 AND 100),
    hallucinated_skills text[] DEFAULT '{}',
    hallucinated_credentials text[] DEFAULT '{}',

    -- Change delta
    change_score smallint NOT NULL DEFAULT 0 CHECK (change_score BETWEEN 0 AND 100),
    change_percent real DEFAULT 0.0,
    similarity_ratio real DEFAULT 0.0,
    change_verdict text DEFAULT '',

    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying a user's eval history
CREATE INDEX idx_eval_results_user_id ON public.resume_eval_results(user_id);
CREATE INDEX idx_eval_results_created_at ON public.resume_eval_results(created_at DESC);

-- RLS: users can only see their own eval results
ALTER TABLE public.resume_eval_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own eval results"
    ON public.resume_eval_results FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eval results"
    ON public.resume_eval_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

'use client'

/**
 * RecommendedJobs — dashboard widget for the shared ingested-job pool.
 *
 * Ingested ATS postings (user_id IS NULL in public.jobs) are invisible to
 * regular client queries under RLS. This widget reaches them through two
 * SECURITY DEFINER functions defined in the
 * 20260418150000_recommendations_rpc.sql migration:
 *
 *   - list_public_jobs(limit, offset)  — enumerate candidates
 *   - save_recommended_job(job_id)     — atomically copy one into the
 *                                        caller's own kanban
 *
 * Scoring happens client-side (simple skills/remote/recency heuristic) to
 * avoid duplicating the ranking logic in SQL. If you later want feature
 * parity with backend/app/services/match_service.py, replace scoreCandidate
 * with a call to /api/v1/match.
 *
 * Props:
 *   userSkills         — caller's skills array, from resume parser / profile
 *   remotePreference   — 'remote' | 'hybrid' | 'onsite' | null
 *   limit              — how many candidates to fetch from the pool (default 100)
 *   displayCount       — how many top-scored rows to render (default 10)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ---- Types ----------------------------------------------------------------

export type PublicJobCandidate = {
  id: string
  title: string
  company: string
  url: string | null
  description: string | null
  location: string | null
  remote_type: string | null
  salary_min: number | null
  salary_max: number | null
  skills: string[]
  tags: string[]
  source: string
  external_id: string | null
  posted_at: string | null
}

type Scored = PublicJobCandidate & {
  score: number
  breakdown: { skills: number; remote: number; recency: number }
}

export type RecommendedJobsProps = {
  userSkills: string[]
  remotePreference?: 'remote' | 'hybrid' | 'onsite' | null
  limit?: number
  displayCount?: number
  /** Called after a successful save so the parent can refresh the kanban. */
  onSaved?: (newJobId: string, savedFrom: PublicJobCandidate) => void
}

// ---- Scoring --------------------------------------------------------------

/** Rough, deterministic match score 0–100. */
function scoreCandidate(
  j: PublicJobCandidate,
  userSkills: string[],
  remotePref: RecommendedJobsProps['remotePreference'],
): Scored {
  // Skills overlap — case-insensitive jaccard, capped at 70 points
  const userLower = new Set(userSkills.map(s => s.toLowerCase().trim()).filter(Boolean))
  const jobLower  = new Set((j.skills ?? []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const overlap   = [...userLower].filter(s => jobLower.has(s)).length
  const denom     = Math.max(userLower.size, 1)
  const skillsScore = Math.round((overlap / denom) * 70)

  // Remote preference — mirrors backend/app/services/match_service.py
  let remoteScore = 0
  const rt = (j.remote_type ?? '').toLowerCase()
  if (remotePref && rt) {
    if (remotePref === rt) remoteScore = 8
    else if (['remote', 'hybrid'].includes(remotePref) && ['remote', 'hybrid'].includes(rt)) remoteScore = 3
    else if ((remotePref === 'remote' && rt === 'onsite') || (remotePref === 'onsite' && rt === 'remote')) remoteScore = -6
  }

  // Recency — up to 10 points for postings in the last 14 days, linear decay
  let recencyScore = 0
  if (j.posted_at) {
    const ageDays = (Date.now() - new Date(j.posted_at).getTime()) / 86_400_000
    recencyScore = Math.max(0, Math.round(10 - (ageDays / 14) * 10))
  }

  const total = Math.max(0, Math.min(100, skillsScore + remoteScore + recencyScore))
  return { ...j, score: total, breakdown: { skills: skillsScore, remote: remoteScore, recency: recencyScore } }
}

// ---- Component ------------------------------------------------------------

export function RecommendedJobs({
  userSkills,
  remotePreference = null,
  limit = 100,
  displayCount = 10,
  onSaved,
}: RecommendedJobsProps) {
  const [rows,  setRows]  = useState<Scored[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  // Default to collapsed so the kanban stays the main focus of the dashboard.
  const [expanded, setExpanded] = useState(false)

  // Stable key for useEffect dependency (skills array identity changes on every render)
  const skillsKey = useMemo(() => userSkills.slice().sort().join('|'), [userSkills])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('list_public_jobs', {
          p_limit:  limit,
          p_offset: 0,
        })
        if (cancelled) return
        if (error) {
          // 42501 = must be authenticated. Surface as "no recommendations" rather than an error
          // so anon/demo users see a tidy empty state instead of a red banner.
          if (/42501|must be authenticated/i.test(error.message)) {
            setRows([])
            setError(null)
            return
          }
          throw new Error(error.message)
        }
        const candidates = (data ?? []) as PublicJobCandidate[]
        const scored = candidates
          .map(j => scoreCandidate(j, userSkills, remotePreference))
          .sort((a, b) => b.score - a.score)
          .slice(0, displayCount)
        setRows(scored)
        setError(null)
      } catch (e: unknown) {
        if (cancelled) return
        setRows([])
        setError(e instanceof Error ? e.message : 'Failed to load recommendations')
      }
    }
    load()
    return () => { cancelled = true }
  }, [skillsKey, remotePreference, limit, displayCount])

  const save = useCallback(async (candidate: Scored) => {
    setSaving(candidate.id)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('save_recommended_job', { p_job_id: candidate.id })
      if (error) throw new Error(error.message)
      const newId = data as string
      setSavedIds(prev => {
        const next = new Set(prev)
        next.add(candidate.id)
        return next
      })
      onSaved?.(newId, candidate)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save job')
    } finally {
      setSaving(null)
    }
  }, [onSaved])

  if (rows === null) {
    return (
      <section className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
        <p className="text-sm text-zinc-400">Loading recommendations…</p>
      </section>
    )
  }

  if (rows.length === 0) {
    // Empty state doubles as the "anon/demo user" state — intentional.
    return null
  }

  return (
    <section className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-800/50"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-50">Recommended for you</span>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
            {rows.length}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="hidden sm:inline">
            Ranked by fit{remotePreference ? ` + ${remotePreference}` : ''}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {expanded && (
      <div className="border-t border-zinc-700 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="sr-only">Recommended for you</h3>
        <span className="text-xs text-zinc-400">
          Ranked by fit against your skills {remotePreference ? `+ ${remotePreference} preference` : ''}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <ul className="divide-y">
        {rows.map(j => {
          const isSaved   = savedIds.has(j.id)
          const isSaving  = saving === j.id
          return (
            <li key={j.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{j.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">· {j.company}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {j.location ?? 'Location not specified'}
                  {j.remote_type ? ` · ${j.remote_type}` : ''}
                  {j.posted_at ? ` · ${new Date(j.posted_at).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className="rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
                  title={`Skills ${j.breakdown.skills} · Remote ${j.breakdown.remote} · Recency ${j.breakdown.recency}`}
                >
                  fit {j.score}%
                </span>
                {j.url && (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  disabled={isSaved || isSaving}
                  onClick={() => save(j)}
                  className="rounded-md border bg-background px-3 py-1 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaved  ? 'Saved' :
                   isSaving ? 'Saving…' :
                              'Save to kanban'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      </div>
      )}
    </section>
  )
}

export default RecommendedJobs

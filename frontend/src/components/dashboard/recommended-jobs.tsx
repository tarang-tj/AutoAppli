'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  onSaved?: (newJobId: string, savedFrom: PublicJobCandidate) => void
}

function scoreCandidate(
  j: PublicJobCandidate,
  userSkills: string[],
  remotePref: RecommendedJobsProps['remotePreference'],
): Scored {
  const userLower = new Set(userSkills.map(s => s.toLowerCase().trim()).filter(Boolean))
  const jobLower  = new Set((j.skills ?? []).map(s => s.toLowerCase().trim()).filter(Boolean))
  const overlap   = [...userLower].filter(s => jobLower.has(s)).length
  const denom     = Math.max(userLower.size, 1)
  const skillsScore = Math.round((overlap / denom) * 70)

  let remoteScore = 0
  const rt = (j.remote_type ?? '').toLowerCase()
  if (remotePref && rt) {
    if (remotePref === rt) remoteScore = 8
    else if (['remote', 'hybrid'].includes(remotePref) && ['remote', 'hybrid'].includes(rt)) remoteScore = 3
    else if ((remotePref === 'remote' && rt === 'onsite') || (remotePref === 'onsite' && rt === 'remote')) remoteScore = -6
  }

  let recencyScore = 0
  if (j.posted_at) {
    const ageDays = (Date.now() - new Date(j.posted_at).getTime()) / 86_400_000
    recencyScore = Math.max(0, Math.round(10 - (ageDays / 14) * 10))
  }

  const total = Math.max(0, Math.min(100, skillsScore + remoteScore + recencyScore))
  return { ...j, score: total, breakdown: { skills: skillsScore, remote: remoteScore, recency: recencyScore } }
}

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
      <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <h3 className="mb-2 text-base font-semibold text-zinc-50">Recommended for you</h3>
        <p className="text-sm text-zinc-400">Loading recommendations…</p>
      </section>
    )
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-zinc-50">Recommended for you</h3>
        <span className="text-xs text-zinc-400">
          Ranked by fit against your skills {remotePreference ? `+ ${remotePreference} preference` : ''}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <ul className="divide-y divide-zinc-800">
        {rows.map(j => {
          const isSaved   = savedIds.has(j.id)
          const isSaving  = saving === j.id
          return (
            <li key={j.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-zinc-50">{j.title}</span>
                  <span className="shrink-0 text-xs text-zinc-400">· {j.company}</span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  {j.location ?? 'Location not specified'}
                  {j.remote_type ? ` · ${j.remote_type}` : ''}
                  {j.posted_at ? ` · ${new Date(j.posted_at).toLocaleDateString()}` : ''}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-200"
                  title={`Skills ${j.breakdown.skills} · Remote ${j.breakdown.remote} · Recency ${j.breakdown.recency}`}
                >
                  fit {j.score}%
                </span>
                {j.url && (
                  
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 underline-offset-2 hover:underline"
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  disabled={isSaved || isSaving}
                  onClick={() => save(j)}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
    </section>
  )
}

export default RecommendedJobs

"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import * as sbInterviewPractice from "@/lib/supabase/interview-practice";
import { useJobs } from "@/hooks/use-jobs";
import type { InterviewPracticeMessage, InterviewPracticeSession, Job, Resume } from "@/types";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PracticeHistoryPanel } from "@/components/interviews/practice-history-panel";
import { ViewingToolbar } from "@/components/interviews/viewing-toolbar";

/**
 * /interviews/practice — live, in-character interview practice with Claude.
 *
 * Three phases:
 *   1. "setup"   — pick a saved job (or paste a JD), confirm resume, click Start.
 *                  Also shows the last N persisted sessions as a history panel
 *                  with replay / delete buttons.
 *   2. "chat"    — live turn-taking with the AI interviewer. Each successful
 *                  reply is persisted to Supabase (RLS, per-user). The session
 *                  row is upserted on first reply and patched on every turn.
 *   3. "viewing" — read-only replay of a past session. Reached by clicking a
 *                  history row or landing on ?sessionId=X. No input box;
 *                  a "Back to setup" button leaves the phase.
 *
 * Persistence is Supabase-direct (see CLAUDE.md — FastAPI is optional).
 * If Supabase env vars are missing, sessions aren't persisted and the
 * history panel simply stays empty.
 */

type ChatMessage = InterviewPracticeMessage;
type Phase = "setup" | "chat" | "viewing";

const KICKOFF_CONTENT = "Let's begin.";

/** Messages we persist and display — drop the synthetic kickoff turn. */
function stripKickoff(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === KICKOFF_CONTENT)
  );
}

export default function InterviewPracticePage() {
  // Wrap in Suspense so useSearchParams doesn't bail out of prerender.
  return (
    <Suspense fallback={null}>
      <InterviewPracticeContent />
    </Suspense>
  );
}

function InterviewPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { jobs } = useJobs();
  const { data: resumes } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false }
  );
  const primaryResume = resumes?.find((r) => r.is_primary) ?? resumes?.[0];

  const persistEnabled = useMemo(() => isSupabaseConfigured(), []);

  const initialJobId = searchParams?.get("jobId") ?? "";
  const initialSessionId = searchParams?.get("sessionId") ?? "";

  const [jobId, setJobId] = useState(initialJobId);
  const [customJD, setCustomJD] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // The session being replayed in "viewing" phase. Separate from the
  // live context so switching back to setup doesn't leak state.
  const [viewingSession, setViewingSession] = useState<InterviewPracticeSession | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Persisted history ─────────────────────────────────────────────
  // Bumped 25 → 200 so the upgraded panel (search + group-by-date/company
  // + per-bucket headers) has enough rows to be meaningful. Sessions
  // stay small (a few KB of JSONB each), so 200 is still cheap.
  const { data: history, mutate: mutateHistory } = useSWR<InterviewPracticeSession[]>(
    persistEnabled ? "/interview-practice/sessions" : null,
    () => sbInterviewPractice.fetchSessions(200),
    { revalidateOnFocus: false }
  );

  // ── Auto-kick to chat when ?jobId is set ─────────────────────────
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (
      !autoStartedRef.current &&
      !initialSessionId &&
      initialJobId &&
      jobs.find((j) => j.id === initialJobId)
    ) {
      autoStartedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, initialJobId, initialSessionId]);

  // ── Load session for ?sessionId= into viewing phase ──────────────
  useEffect(() => {
    if (!initialSessionId || !persistEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await sbInterviewPractice.fetchSession(initialSessionId);
        if (cancelled) return;
        setViewingSession(s);
        setPhase("viewing");
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Could not load that session"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSessionId, persistEnabled]);

  // ── Scroll transcript on update ───────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending, viewingSession]);

  // Resolve the active job context (saved job OR pasted JD fallback).
  const activeContext = useMemo(() => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      return {
        job_id: job.id as string | null,
        job_title: job.title,
        company: job.company,
        job_description: job.description ?? "",
      };
    }
    return {
      job_id: null as string | null,
      job_title: customTitle || "the role",
      company: customCompany || "the company",
      job_description: customJD,
    };
  }, [jobId, jobs, customTitle, customCompany, customJD]);

  const canStart = Boolean(
    jobId || (customTitle.trim() && customCompany.trim())
  );

  // Persist the session on first reply (insert), or patch in place.
  // Silent on failure — persistence is a nice-to-have, never a blocker.
  const persistSession = useCallback(
    async (nextMessages: ChatMessage[], opts: { ended?: boolean } = {}) => {
      if (!persistEnabled) return;
      const cleaned = stripKickoff(nextMessages);
      if (cleaned.length === 0) return;

      try {
        if (!sessionId) {
          const row = await sbInterviewPractice.createSession({
            job_id: activeContext.job_id,
            job_title: activeContext.job_title,
            company: activeContext.company,
            job_description: activeContext.job_description || null,
            resume_snapshot: primaryResume?.parsed_text ?? null,
            messages: cleaned,
          });
          setSessionId(row.id);
          void mutateHistory();
        } else {
          await sbInterviewPractice.updateSession(sessionId, {
            messages: cleaned,
            ended: opts.ended,
          });
          void mutateHistory();
        }
      } catch (err) {
        // Log silently — don't interrupt the live chat flow.
        // eslint-disable-next-line no-console
        console.warn("Interview session persist failed:", err);
      }
    },
    [persistEnabled, sessionId, activeContext, primaryResume, mutateHistory]
  );

  const start = useCallback(async () => {
    setPending(true);
    setMessages([]);
    setSessionId(null);
    setPhase("chat");
    const kickoff: ChatMessage = {
      role: "user",
      content: KICKOFF_CONTENT,
      ts: Date.now(),
    };
    try {
      const res = await fetch("/api/ai/interview-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: kickoff.content }],
          job_title: activeContext.job_title,
          company: activeContext.company,
          job_description: activeContext.job_description,
          resume_text: primaryResume?.parsed_text ?? "",
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { reply?: string; error?: string };
      if (data.error) throw new Error(data.error);
      const nextMessages: ChatMessage[] = [
        kickoff,
        { role: "assistant", content: data.reply ?? "(no reply)", ts: Date.now() },
      ];
      setMessages(nextMessages);
      void persistSession(nextMessages);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start");
      setPhase("setup");
    } finally {
      setPending(false);
    }
  }, [activeContext, primaryResume, persistSession]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || pending) return;
      const next: ChatMessage = { role: "user", content: text.trim(), ts: Date.now() };
      const afterUser = [...messages, next];
      setMessages(afterUser);
      setDraft("");
      setPending(true);
      try {
        const res = await fetch("/api/ai/interview-practice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: afterUser.map((m) => ({ role: m.role, content: m.content })),
            job_title: activeContext.job_title,
            company: activeContext.company,
            job_description: activeContext.job_description,
            resume_text: primaryResume?.parsed_text ?? "",
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as { reply?: string; error?: string };
        if (data.error) throw new Error(data.error);
        const reply: ChatMessage = {
          role: "assistant",
          content: data.reply ?? "(no reply)",
          ts: Date.now(),
        };
        const afterReply = [...afterUser, reply];
        setMessages(afterReply);
        // Detect debrief turn by the magic "end" send, so we can close out
        // the row with ended=true when that debrief assistant reply lands.
        const isEndDebrief = text.trim().toLowerCase() === "end";
        void persistSession(afterReply, { ended: isEndDebrief });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Network error");
      } finally {
        setPending(false);
      }
    },
    [messages, activeContext, primaryResume, pending, persistSession]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  const endSession = useCallback(() => {
    if (pending) return;
    void send("end");
  }, [send, pending]);

  const reset = useCallback(() => {
    setMessages([]);
    setDraft("");
    setSessionId(null);
    setPhase("setup");
    autoStartedRef.current = false;
  }, []);

  const openSession = useCallback(
    async (id: string) => {
      if (!persistEnabled) return;
      try {
        const s = await sbInterviewPractice.fetchSession(id);
        setViewingSession(s);
        setPhase("viewing");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load session");
      }
    },
    [persistEnabled]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!persistEnabled) return;
      try {
        await sbInterviewPractice.deleteSession(id);
        void mutateHistory();
        toast.success("Session deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete");
      }
    },
    [persistEnabled, mutateHistory]
  );

  const exitViewing = useCallback(() => {
    setViewingSession(null);
    setPhase("setup");
    // Strip ?sessionId from the URL so the effect doesn't kick us back in.
    if (initialSessionId) {
      router.replace("/interviews/practice");
    }
  }, [router, initialSessionId]);

  // ── Sprint 2 actions: replay context, copy, share ────────────────

  /**
   * Pre-fill the setup form with a past session's job context so the
   * user can launch a fresh practice run for the same role with one
   * more click. We deliberately don't auto-start — the user gets to
   * see what's loaded and tweak if they want, which avoids surprise.
   */
  const replayWithContext = useCallback(
    (s: InterviewPracticeSession) => {
      // If the original job is still in their kanban, prefer the
      // saved-job path (richer context, lives across resume edits).
      // Otherwise fall back to the snapshot fields on the session row.
      const savedJob = s.job_id ? jobs.find((j) => j.id === s.job_id) : null;
      if (savedJob) {
        setJobId(savedJob.id);
        setCustomTitle("");
        setCustomCompany("");
        setCustomJD("");
      } else {
        setJobId("");
        setCustomTitle(s.job_title);
        setCustomCompany(s.company);
        setCustomJD(s.job_description ?? "");
      }
      setViewingSession(null);
      setPhase("setup");
      autoStartedRef.current = true; // suppress the ?jobId auto-kick
      if (initialSessionId) {
        router.replace("/interviews/practice");
      }
      toast.success(`Loaded ${s.company} — press Start to begin`);
    },
    [jobs, initialSessionId, router]
  );

  const copyTranscript = useCallback(async (s: InterviewPracticeSession) => {
    const lines = stripKickoff(s.messages).map((m) => {
      const speaker = m.role === "user" ? "Me" : "Interviewer";
      return `${speaker}:\n${m.content}`;
    });
    const header = `${s.job_title} · ${s.company}\n${new Date(
      s.created_at
    ).toLocaleString()}\n\n`;
    const text = header + lines.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Transcript copied");
    } catch {
      toast.error("Could not copy — clipboard blocked");
    }
  }, []);

  const shareSession = useCallback(async (s: InterviewPracticeSession) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/interviews/practice?sessionId=${s.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — anyone on your account can open it");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  // ── Viewing phase ────────────────────────────────────────────────
  if (phase === "viewing" && viewingSession) {
    const rendered = stripKickoff(viewingSession.messages);
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={exitViewing}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              <ArrowLeft aria-hidden="true" className="h-3 w-3" />
              Back to setup
            </button>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Briefcase aria-hidden="true" className="h-3 w-3" />
              <span className="truncate">
                {viewingSession.job_title} · {viewingSession.company}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-white truncate">
              Past practice session
            </h1>
          </div>
          <div className="text-[11px] text-zinc-500 shrink-0">
            {new Date(viewingSession.created_at).toLocaleString()}
            {viewingSession.ended && (
              <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-200">
                debriefed
              </span>
            )}
          </div>
        </div>

        <ViewingToolbar
          onReplay={() => replayWithContext(viewingSession)}
          onCopy={() => void copyTranscript(viewingSession)}
          onShare={() => void shareSession(viewingSession)}
        />

        <div
          ref={scrollRef}
          role="log"
          aria-label="Past interview transcript"
          className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4"
        >
          {rendered.length === 0 ? (
            <p className="text-sm text-zinc-500">No messages recorded.</p>
          ) : (
            rendered.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
        </div>

        <div className="mt-3 text-[11px] text-zinc-500 text-center">
          Viewing past session — replay only. Use &quot;Practice again&quot; to start a new one with the same role.
        </div>
      </div>
    );
  }

  // ── Setup phase ──────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.push("/interviews")}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        >
          <ArrowLeft aria-hidden="true" className="h-3 w-3" />
          Back to Interview Prep
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 mb-3">
            <Sparkles aria-hidden="true" className="h-3 w-3" />
            New — AI practice sessions
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Practice interview
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Pick a role and we&apos;ll play the hiring manager — warm-up
            question, follow-ups, inline feedback after each answer, then a
            short debrief when you&apos;re done.
            {persistEnabled && " Sessions are saved so you can revisit them later."}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px] max-w-5xl">
          {/* Setup form */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-5">
            <div>
              <label htmlFor="practice-saved-job" className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Use a saved job
              </label>
              {jobs.length > 0 ? (
                <select
                  id="practice-saved-job"
                  name="job_id"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-sm text-white px-3 py-2"
                >
                  <option value="">— Pick a role —</option>
                  {jobs.map((j: Job) => (
                    <option key={j.id} value={j.id}>
                      {j.title} · {j.company}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-zinc-500">
                  No saved roles yet. Add one on the Dashboard, or paste the
                  details below.
                </p>
              )}
            </div>

            {!jobId && (
              <fieldset className="border-t border-zinc-800 pt-5 space-y-3">
                <legend className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Or describe a role manually
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    id="practice-custom-title"
                    name="custom_title"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Job title"
                    aria-label="Job title"
                    autoComplete="off"
                    className="rounded-md bg-zinc-800 border border-zinc-700 text-sm text-white px-3 py-2 placeholder:text-zinc-500"
                  />
                  <input
                    id="practice-custom-company"
                    name="custom_company"
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    placeholder="Company"
                    aria-label="Company"
                    autoComplete="off"
                    className="rounded-md bg-zinc-800 border border-zinc-700 text-sm text-white px-3 py-2 placeholder:text-zinc-500"
                  />
                </div>
                <textarea
                  id="practice-custom-jd"
                  name="custom_job_description"
                  value={customJD}
                  onChange={(e) => setCustomJD(e.target.value)}
                  rows={5}
                  placeholder="Paste the job description (optional but improves question quality)"
                  aria-label="Job description (optional)"
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-sm text-white px-3 py-2 placeholder:text-zinc-500 resize-y"
                />
              </fieldset>
            )}

            <div className="border-t border-zinc-800 pt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">
                {primaryResume
                  ? `Using primary resume: ${primaryResume.file_name}`
                  : "No resume uploaded — feedback will be generic."}
              </div>
              <button
                type="button"
                disabled={!canStart || pending}
                aria-busy={pending}
                onClick={() => void start()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                {pending ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    Start practice
                  </>
                )}
              </button>
            </div>
          </div>

          {/* History panel — search, group-by, per-row actions */}
          <PracticeHistoryPanel
            sessions={history}
            persistEnabled={persistEnabled}
            onOpen={(id) => void openSession(id)}
            onReplay={replayWithContext}
            onCopy={(s) => void copyTranscript(s)}
            onShare={(s) => void shareSession(s)}
            onDelete={(id) => void deleteSession(id)}
          />
        </div>
      </div>
    );
  }

  // ── Chat phase ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Briefcase aria-hidden="true" className="h-3 w-3" />
            <span className="truncate">
              Practicing: {activeContext.job_title} · {activeContext.company}
            </span>
          </div>
          <h1 className="text-lg font-semibold text-white truncate">
            Mock interview
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            aria-label="Start a new practice session"
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
            New session
          </button>
          <button
            type="button"
            onClick={endSession}
            disabled={pending}
            aria-label="End the interview and request a debrief"
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <StopCircle aria-hidden="true" className="h-3 w-3" />
            End &amp; debrief
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Interview transcript"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4"
      >
        {stripKickoff(messages).map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {pending && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-zinc-500 pl-11">
            <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:animate-none" />
            Interviewer is typing…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        aria-busy={pending}
        aria-label="Send a reply"
        className="mt-3 flex items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2"
      >
        <label htmlFor="practice-reply" className="sr-only">
          Your reply
        </label>
        <textarea
          ref={inputRef}
          id="practice-reply"
          name="reply"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
          aria-describedby="practice-reply-hint"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none px-2 py-1.5"
          disabled={pending}
        />
        <span id="practice-reply-hint" className="sr-only">
          Press Enter to send. Shift plus Enter for a new line.
        </span>
        <button
          type="submit"
          disabled={!draft.trim() || pending}
          aria-busy={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <Send aria-hidden="true" className="h-3.5 w-3.5" />
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const speaker = isUser ? "You" : "Interviewer";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        aria-hidden="true"
        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
            : "bg-violet-600/20 text-violet-300 border border-violet-500/30"
        }`}
      >
        {isUser ? <User aria-hidden="true" className="h-4 w-4" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tl-sm"
        }`}
      >
        <span className="sr-only">{speaker}: </span>
        {message.content}
      </div>
    </div>
  );
}

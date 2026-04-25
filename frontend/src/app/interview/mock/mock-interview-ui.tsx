"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  endSession,
  startSession,
  submitTurn,
  type EndResponse,
  type SessionStartResponse,
  type TurnRecord,
} from "@/lib/mock-interview/api";

// ── Types ─────────────────────────────────────────────────────────────────

type Stage = "setup" | "active" | "complete";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "swe-intern", label: "Software Engineering Intern" },
  { value: "swe-new-grad", label: "Software Engineer (New Grad)" },
  { value: "pm-intern", label: "Product Management Intern" },
  { value: "data-intern", label: "Data Science / Analytics Intern" },
  { value: "design-intern", label: "UX / Product Design Intern" },
  { value: "general", label: "General Role" },
];

const NUM_Q_OPTIONS = [3, 5, 7];

const DIMENSION_LABELS: Record<string, string> = {
  clarity: "Clarity",
  structure: "Structure",
  specificity: "Specificity",
  relevance: "Relevance",
};

// ── Subcomponents ─────────────────────────────────────────────────────────

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex-shrink-0 rounded-full bg-blue-500/20 border border-blue-500/30 p-1.5">
        <Bot className="h-3.5 w-3.5 text-blue-300" aria-hidden />
      </div>
      <div className="rounded-xl rounded-tl-sm bg-zinc-800 border border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-100 leading-relaxed max-w-prose">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="rounded-xl rounded-tr-sm bg-blue-600/30 border border-blue-500/30 px-3.5 py-2.5 text-sm text-zinc-100 leading-relaxed max-w-prose">
        {text}
      </div>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-zinc-300">
        <span>{label}</span>
        <span className="font-semibold text-zinc-100">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function MockInterviewUI() {
  const [stage, setStage] = useState<Stage>("setup");

  // Setup form state
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("swe-intern");
  const [numQuestions, setNumQuestions] = useState(5);

  // Active session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Complete state
  const [scorecard, setScorecard] = useState<EndResponse | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    // Small delay so DOM updates before scroll
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleStart() {
    if (jd.trim().length < 10) {
      setError("Paste at least 10 characters of the job description.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res: SessionStartResponse = await startSession(jd.trim(), role, numQuestions);
      setSessionId(res.session_id);
      setTotalQuestions(res.total);
      setQuestionIndex(res.question_index);
      setMessages([{ role: "ai", text: res.question }]);
      setStage("active");
      scrollToBottom();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start session. Check your API connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!sessionId || !currentAnswer.trim()) return;
    setError(null);
    setSubmitting(true);
    const answerText = currentAnswer.trim();
    setCurrentAnswer("");

    // Optimistically show the user's answer
    setMessages((prev) => [...prev, { role: "user", text: answerText }]);
    scrollToBottom();

    try {
      const res = await submitTurn(sessionId, answerText);
      setQuestionIndex(res.question_index);

      // Add AI feedback bubble
      setMessages((prev) => [...prev, { role: "ai", text: res.feedback }]);

      if (res.complete) {
        // Fetch scorecard
        const card = await endSession(sessionId);
        setScorecard(card);
        setStage("complete");
      } else if (res.next_question) {
        setMessages((prev) => [...prev, { role: "ai", text: res.next_question! }]);
      }
      scrollToBottom();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStage("setup");
    setSessionId(null);
    setMessages([]);
    setCurrentAnswer("");
    setScorecard(null);
    setError(null);
    setJd("");
    setRole("swe-intern");
    setNumQuestions(5);
  }

  // ── Render: Setup ────────────────────────────────────────────────────────

  if (stage === "setup") {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
            <Sparkles aria-hidden className="h-6 w-6 text-blue-400" />
            AI Mock Interview
          </h1>
          <p className="mt-1 text-sm text-zinc-300 leading-relaxed max-w-xl">
            Practice with an AI interviewer. Paste the job description, pick a focus, and get
            question-by-question feedback.
          </p>
        </header>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardContent className="space-y-5 pt-5">
            {error && (
              <p role="alert" className="text-sm text-red-400 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="jd-input" className="text-zinc-200">
                Job description *
              </Label>
              <Textarea
                id="jd-input"
                placeholder="Paste the job description here (requirements, responsibilities, etc.)…"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={7}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role-select" className="text-zinc-200">
                  Role focus
                </Label>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numq-select" className="text-zinc-200">
                  Number of questions
                </Label>
                <select
                  id="numq-select"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2"
                >
                  {NUM_Q_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} questions
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              data-testid="mock-start"
              onClick={handleStart}
              disabled={submitting || jd.trim().length < 10}
              className="w-full bg-blue-600 hover:bg-blue-700"
              aria-busy={submitting}
            >
              {submitting ? "Starting interview…" : "Start practice interview"}
              {!submitting && <ChevronRight aria-hidden className="ml-1 h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Active ───────────────────────────────────────────────────────

  if (stage === "active") {
    const progress = totalQuestions > 0 ? (questionIndex / totalQuestions) * 100 : 0;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-zinc-50">Practice Interview</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Question {Math.min(questionIndex + 1, totalQuestions)} of {totalQuestions}
            </p>
          </div>
          <div className="h-2 flex-1 min-w-[8rem] rounded-full bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={questionIndex}
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              aria-label="Interview progress"
            />
          </div>
        </header>

        {error && (
          <p role="alert" className="text-sm text-red-400 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2">
            {error}
          </p>
        )}

        {/* Chat scroll area */}
        <div
          className="space-y-3 min-h-[12rem] max-h-[28rem] overflow-y-auto rounded-xl bg-zinc-950/50 border border-zinc-800 p-4"
          aria-live="polite"
          aria-label="Interview conversation"
        >
          {messages.map((msg, i) =>
            msg.role === "ai" ? (
              <AiBubble key={i} text={msg.text} />
            ) : (
              <UserBubble key={i} text={msg.text} />
            ),
          )}
          {submitting && (
            <AiBubble text="Thinking…" />
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Answer area */}
        <div className="space-y-3">
          <Textarea
            placeholder="Type your answer here… Use STAR format: Situation, Task, Action, Result"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            rows={4}
            disabled={submitting}
            className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !submitting) {
                e.preventDefault();
                handleSubmitAnswer();
              }
            }}
            aria-label="Your answer"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-zinc-500">Cmd+Enter to submit</p>
            <Button
              data-testid="mock-submit-answer"
              onClick={handleSubmitAnswer}
              disabled={submitting || !currentAnswer.trim()}
              className="bg-blue-600 hover:bg-blue-700"
              aria-busy={submitting}
            >
              {submitting ? "Submitting…" : "Submit answer"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Complete ─────────────────────────────────────────────────────

  const card = scorecard;
  if (!card) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-5" data-testid="mock-end-summary">
      <header>
        <h1 className="text-2xl font-bold text-zinc-50">Interview Complete</h1>
        <p className="mt-1 text-sm text-zinc-300">Here&rsquo;s how your practice session went.</p>
      </header>

      {/* Overall score */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardContent className="flex items-center gap-6 py-6">
          <div
            className="flex-shrink-0 h-20 w-20 rounded-full border-4 flex items-center justify-center text-2xl font-bold"
            style={{
              borderColor:
                card.overall >= 80 ? "#10b981" : card.overall >= 60 ? "#f59e0b" : "#ef4444",
              color:
                card.overall >= 80 ? "#10b981" : card.overall >= 60 ? "#f59e0b" : "#ef4444",
            }}
            aria-label={`Overall score: ${card.overall} out of 100`}
          >
            {card.overall}
          </div>
          <div>
            <p className="text-lg font-semibold text-zinc-100">Overall Score</p>
            <p className="text-sm text-zinc-400 mt-0.5">
              {card.overall >= 80
                ? "Strong performance. Polish the details."
                : card.overall >= 60
                  ? "Solid foundation. Keep practicing specifics."
                  : "Good start. Focus on STAR structure and examples."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dimension scores */}
      <Card className="bg-zinc-900 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-zinc-100 text-sm font-semibold uppercase tracking-wide">
            Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          {Object.entries(card.dimensions).map(([key, val]) => (
            <ScoreBar key={key} score={val} label={DIMENSION_LABELS[key] ?? key} />
          ))}
        </CardContent>
      </Card>

      {/* Strengths & improvements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-emerald-300 text-sm font-semibold uppercase tracking-wide">
              Top Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <ul className="space-y-1.5 list-none">
              {card.top_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-amber-300 text-sm font-semibold uppercase tracking-wide">
              Top Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <ul className="space-y-1.5 list-none">
              {card.top_improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleReset}
          variant="outline"
          className="border-zinc-600 text-zinc-100 bg-zinc-900/50 hover:bg-zinc-800"
        >
          <RotateCcw aria-hidden className="h-4 w-4 mr-2" />
          Practice again
        </Button>
        <Link
          href="/stories?from=mock"
          className="inline-flex items-center gap-2 rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20 transition-colors"
        >
          <Sparkles aria-hidden className="h-4 w-4" />
          Save to Story Library
        </Link>
      </div>
    </div>
  );
}

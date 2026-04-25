/**
 * MockInterviewUI — state machine + orchestration for /interview/mock.
 *
 * Three stages, three visual acts:
 *   setup    → CallSheetStage     (the call sheet, backstage)
 *   active   → SpotlightStage     (under the spotlight, on stage)
 *   complete → CurtainCallStage   (the curtain falls, scorecard)
 *
 * All API I/O lives here. Stage components are pure presentation.
 * StageBackdrop wraps everything with the cinematic atmosphere.
 *
 * IMPORTANT: preserves data-testid attributes referenced by Playwright:
 *   mock-start, mock-submit-answer, mock-end-summary
 */

"use client";

import { useState } from "react";
import {
  endSession,
  startSession,
  submitTurn,
  type EndResponse,
  type SessionStartResponse,
} from "@/lib/mock-interview/api";
import { StageBackdrop } from "./_components/stage-atmosphere";
import { CallSheetStage } from "./_components/call-sheet-stage";
import { SpotlightStage, type DialogueLine } from "./_components/spotlight-stage";
import { CurtainCallStage } from "./_components/curtain-call-stage";

// ── Types & constants ─────────────────────────────────────────────────────

type Stage = "setup" | "active" | "complete";

const ROLE_OPTIONS = [
  { value: "swe-intern", label: "Software Engineering Intern" },
  { value: "swe-new-grad", label: "Software Engineer (New Grad)" },
  { value: "pm-intern", label: "Product Management Intern" },
  { value: "data-intern", label: "Data Science / Analytics Intern" },
  { value: "design-intern", label: "UX / Product Design Intern" },
  { value: "general", label: "General Role" },
];

const NUM_Q_OPTIONS = [3, 5, 7];

// ── Component ─────────────────────────────────────────────────────────────

export function MockInterviewUI() {
  const [stage, setStage] = useState<Stage>("setup");

  // Setup form
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("swe-intern");
  const [numQuestions, setNumQuestions] = useState(5);

  // Live session
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<DialogueLine[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Final scorecard
  const [scorecard, setScorecard] = useState<EndResponse | null>(null);

  async function handleStart() {
    if (jd.trim().length < 10) {
      setError("Paste at least 10 characters of the job description.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res: SessionStartResponse = await startSession(
        jd.trim(),
        role,
        numQuestions,
      );
      setSessionId(res.session_id);
      setTotalQuestions(res.total);
      setQuestionIndex(res.question_index);
      setMessages([{ role: "ai", text: res.question }]);
      setStage("active");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start session. Check your API connection.",
      );
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
    setMessages((prev) => [...prev, { role: "user", text: answerText }]);

    try {
      const res = await submitTurn(sessionId, answerText);
      setQuestionIndex(res.question_index);
      setMessages((prev) => [...prev, { role: "ai", text: res.feedback }]);

      if (res.complete) {
        const card = await endSession(sessionId);
        setScorecard(card);
        setStage("complete");
      } else if (res.next_question) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: res.next_question! },
        ]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to submit answer.",
      );
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

  return (
    <StageBackdrop spotlightHot={stage === "active"}>
      {stage === "setup" && (
        <CallSheetStage
          jd={jd}
          setJd={setJd}
          role={role}
          setRole={setRole}
          numQuestions={numQuestions}
          setNumQuestions={setNumQuestions}
          submitting={submitting}
          error={error}
          onStart={handleStart}
          roleOptions={ROLE_OPTIONS}
          numQOptions={NUM_Q_OPTIONS}
        />
      )}

      {stage === "active" && (
        <SpotlightStage
          totalQuestions={totalQuestions}
          questionIndex={questionIndex}
          messages={messages}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {stage === "complete" && scorecard && (
        <CurtainCallStage card={scorecard} onReset={handleReset} />
      )}
    </StageBackdrop>
  );
}

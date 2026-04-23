"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Target,
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

// ── Types matching the backend ResumeEvalResponse ──────────────────────────

export interface KeywordCoverage {
  score: number;
  matched: string[];
  missing: string[];
  total_keywords: number;
}

export interface HallucinationCheck {
  score: number;
  hallucinated_skills: string[];
  hallucinated_credentials: string[];
}

export interface ChangeDelta {
  score: number;
  change_percent: number;
  similarity_ratio: number;
  verdict: string;
  added_sentences: number;
  removed_sentences: number;
}

export interface EvalResult {
  overall_score: number;
  keyword_coverage: KeywordCoverage;
  hallucination_check: HallucinationCheck;
  change_delta: ChangeDelta;
}

// ── Score ring (SVG donut) ─────────────────────────────────────────────────

function ScoreRing({ score, size = 56, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const bgColor =
    score >= 75 ? "text-emerald-900/40" : score >= 50 ? "text-amber-900/40" : "text-red-900/40";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className={bgColor}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}
        >
          {score}
        </span>
      </div>
      <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">{label}</span>
    </div>
  );
}

// ── Expandable section ─────────────────────────────────────────────────────

function Section({
  icon,
  title,
  score,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  score: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const color =
    score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-zinc-400">{icon}</span>
        <span className="text-sm font-medium text-zinc-200 flex-1 text-left">{title}</span>
        <span className={`text-sm font-bold ${color}`}>{score}</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        )}
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// ── Keyword tag list ───────────────────────────────────────────────────────

function TagList({ tags, variant }: { tags: string[]; variant: "matched" | "missing" }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className={
            variant === "matched"
              ? "bg-emerald-950/60 text-emerald-300 text-sm"
              : "bg-red-950/60 text-red-300 text-sm"
          }
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function EvalScoreCard({ eval_result }: { eval_result: EvalResult }) {
  const { keyword_coverage, hallucination_check, change_delta, overall_score } = eval_result;

  const verdictLabel: Record<string, string> = {
    minimal_change: "Barely changed — may not be tailored enough",
    well_tailored: "Good amount of tailoring",
    heavily_rewritten: "Heavily rewritten — verify it still sounds like you",
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-zinc-400" />
          Eval Score
        </CardTitle>
        <p className="text-xs text-zinc-500">
          How well the tailored resume matches the job description without fabricating content.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score rings */}
        <div className="flex items-center justify-around py-2">
          <ScoreRing score={overall_score} size={64} label="Overall" />
          <ScoreRing score={keyword_coverage.score} label="Keywords" />
          <ScoreRing score={hallucination_check.score} label="Accuracy" />
          <ScoreRing score={change_delta.score} label="Tailoring" />
        </div>

        {/* Expandable details */}
        <div className="space-y-2">
          <Section
            icon={<Target className="h-4 w-4" />}
            title="Keyword Coverage"
            score={keyword_coverage.score}
          >
            <p className="text-xs text-zinc-400">
              {keyword_coverage.matched.length} of {keyword_coverage.total_keywords} key terms from
              the JD appear in your tailored resume.
            </p>
            <div className="space-y-1.5">
              <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium">
                Matched
              </p>
              <TagList tags={keyword_coverage.matched} variant="matched" />
            </div>
            {keyword_coverage.missing.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium">
                  Missing — consider adding
                </p>
                <TagList tags={keyword_coverage.missing} variant="missing" />
              </div>
            )}
          </Section>

          <Section
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Hallucination Check"
            score={hallucination_check.score}
          >
            {hallucination_check.hallucinated_skills.length === 0 &&
            hallucination_check.hallucinated_credentials.length === 0 ? (
              <p className="text-xs text-emerald-400">
                No fabricated skills or credentials detected.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-300">
                  These items appear in the tailored resume but weren't in your original — verify
                  before submitting.
                </p>
                {hallucination_check.hallucinated_skills.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium mb-1">
                      Skills not in original
                    </p>
                    <TagList tags={hallucination_check.hallucinated_skills} variant="missing" />
                  </div>
                )}
                {hallucination_check.hallucinated_credentials.length > 0 && (
                  <div>
                    <p className="text-sm text-zinc-500 uppercase tracking-wide font-medium mb-1">
                      Credentials not in original
                    </p>
                    <TagList tags={hallucination_check.hallucinated_credentials} variant="missing" />
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section
            icon={<ArrowRightLeft className="h-4 w-4" />}
            title="Change Delta"
            score={change_delta.score}
          >
            <p className="text-xs text-zinc-400">
              {change_delta.change_percent}% of the content changed.{" "}
              {verdictLabel[change_delta.verdict] || change_delta.verdict}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <span>+ {change_delta.added_sentences} new sentences</span>
              <span>− {change_delta.removed_sentences} removed</span>
            </div>
          </Section>
        </div>
      </CardContent>
    </Card>
  );
}

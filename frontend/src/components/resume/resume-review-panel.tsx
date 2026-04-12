"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeReview } from "@/types";
import { ClipboardList, Loader2 } from "lucide-react";

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">{title}</h4>
      <ul className="text-sm text-zinc-300 space-y-1.5 list-disc pl-4">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ResumeReviewPanel({
  review,
  loading,
  disabled,
  onRequestReview,
}: {
  review: ResumeReview | null;
  loading: boolean;
  disabled: boolean;
  onRequestReview: () => void;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-zinc-400" />
          Resume feedback
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={onRequestReview}
          className="border-zinc-600 text-zinc-200 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing…
            </>
          ) : (
            "Get AI review"
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!review ? (
          <p className="text-sm text-zinc-500">
            Get structured feedback on your <span className="text-zinc-400">original</span> resume text
            (strengths, ATS-oriented tips, and keywords). Uses the selected uploaded resume.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-200">
                Overall {review.overall_score}/10
              </Badge>
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-200">
                ATS {review.ats_score}/10
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ListBlock title="Strengths" items={review.strengths} />
              <ListBlock title="Improvements" items={review.improvements} />
              <ListBlock title="ATS issues" items={review.ats_issues} />
              <ListBlock title="Missing sections" items={review.missing_sections} />
            </div>
            <ListBlock title="Keyword ideas" items={review.keyword_suggestions} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { useMemo } from "react";

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","can",
  "this","that","these","those","it","its","i","we","you","they","he",
  "she","my","your","our","their","what","which","who","where","when",
  "how","not","no","if","then","than","so","as","up","out","about",
  "into","over","after","before","between","under","above","such",
  "each","every","all","any","both","few","more","most","other","some",
  "very","just","also","too","only","own","same","new","well","now",
  "even","way","part","able","like","year","years","work","working",
  "experience","role","team","company","join","looking","ideal",
  "candidate","including","using","across","etc","strong","highly",
  "must","required","preferred","ability","skills","knowledge",
  "minimum","plus","related","relevant","provide","ensure","responsible",
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function KeywordMatch({
  resumeText,
  jobDescription,
}: {
  resumeText: string;
  jobDescription: string;
}) {
  const analysis = useMemo(() => {
    if (!resumeText.trim() || !jobDescription.trim()) return null;

    const jdKeywords = extractKeywords(jobDescription);
    const resumeKeywords = extractKeywords(resumeText);

    // Focus on meaningful keywords — longer words, tech terms
    const importantJdKeywords = [...jdKeywords].filter(
      (w) => w.length > 3 || /[+#.]/.test(w)
    );

    const matched = importantJdKeywords.filter((w) => resumeKeywords.has(w));
    const missing = importantJdKeywords
      .filter((w) => !resumeKeywords.has(w))
      .slice(0, 15);
    const matchRate =
      importantJdKeywords.length > 0
        ? Math.round((matched.length / importantJdKeywords.length) * 100)
        : 0;

    // Deduplicate and take top matches
    const topMatched = [...new Set(matched)].slice(0, 20);
    const topMissing = [...new Set(missing)].slice(0, 12);

    return { matchRate, matched: topMatched, missing: topMissing };
  }, [resumeText, jobDescription]);

  if (!analysis) return null;

  const color =
    analysis.matchRate >= 70
      ? "text-emerald-400"
      : analysis.matchRate >= 40
        ? "text-amber-400"
        : "text-red-400";

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-400" aria-hidden />
          Keyword Match
          <span className={`ml-auto text-lg font-bold ${color}`}>
            {analysis.matchRate}%
          </span>
        </CardTitle>
        <p className="text-xs text-zinc-500">
          How well your resume keywords align with the job description
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis.matched.length > 0 && (
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium mb-1.5">
              Matched keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {analysis.matched.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="bg-emerald-950/60 text-emerald-300 text-[11px]"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {analysis.missing.length > 0 && (
          <div>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium mb-1.5">
              Missing from resume — consider adding
            </p>
            <div className="flex flex-wrap gap-1">
              {analysis.missing.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="bg-red-950/60 text-red-300 text-[11px]"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

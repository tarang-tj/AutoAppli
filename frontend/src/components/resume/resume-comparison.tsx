"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  originalText: string;
  tailoredText: string;
}

export function ResumeComparison({ originalText, tailoredText }: Props) {
  const [view, setView] = useState<"side-by-side" | "original" | "tailored">("side-by-side");

  if (!originalText.trim() || !tailoredText.trim()) return null;

  const origWords = new Set(
    originalText.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean)
  );
  const tailWords = tailoredText.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const newWords = tailWords.filter((w) => !origWords.has(w) && w.length > 3);
  const uniqueNew = [...new Set(newWords)].length;

  const origLines = originalText.split("\n").filter(Boolean).length;
  const tailLines = tailoredText.split("\n").filter(Boolean).length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-blue-400" aria-hidden />
            Before vs After
          </CardTitle>
          <div className="flex gap-1">
            {(["side-by-side", "original", "tailored"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                  view === v
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              >
                {v === "side-by-side" ? "Side by side" : v === "original" ? "Original" : "Tailored"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 text-[11px] text-zinc-500 mt-1">
          <span>Original: {origLines} lines, {originalText.length.toLocaleString()} chars</span>
          <span>Tailored: {tailLines} lines, {tailoredText.length.toLocaleString()} chars</span>
          <span className="text-emerald-500">{uniqueNew} new keywords added</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("gap-3", view === "side-by-side" ? "grid grid-cols-2" : "grid grid-cols-1")}>
          {(view === "side-by-side" || view === "original") && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 max-h-72 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Original</p>
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
                {originalText.slice(0, 3000)}
                {originalText.length > 3000 && <span className="text-zinc-600">{"\n"}... truncated</span>}
              </pre>
            </div>
          )}
          {(view === "side-by-side" || view === "tailored") && (
            <div className="rounded-lg border border-emerald-900/50 bg-zinc-950 p-3 max-h-72 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-2">Tailored</p>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                {tailoredText.slice(0, 3000)}
                {tailoredText.length > 3000 && <span className="text-zinc-600">{"\n"}... truncated</span>}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

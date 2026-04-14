"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Kanban,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "resume",
    icon: Upload,
    title: "Upload your resume",
    description:
      "Start by uploading your current resume. Our AI uses it to tailor applications and score your fit against job descriptions.",
    href: "/resume",
    cta: "Upload resume",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    id: "search",
    icon: Search,
    title: "Find your first job",
    description:
      "Search 300+ live listings by keyword and location. Bookmark anything interesting and it lands on your Kanban board automatically.",
    href: "/jobs",
    cta: "Search jobs",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  {
    id: "tailor",
    icon: Sparkles,
    title: "Tailor and apply",
    description:
      "Paste a job description, and Claude AI rewrites your resume to match. Generate a cover letter, outreach message, or interview prep in one click.",
    href: "/resume",
    cta: "Tailor resume",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
] as const;

export function OnboardingWizard({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  return (
    <Card className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-zinc-700/60 shadow-xl shadow-blue-500/5 overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <CardContent className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Kanban className="h-5 w-5 text-blue-400" />
              Welcome to AutoAppli
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Get set up in three quick steps — your job search command center is ready.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-zinc-500 hover:text-zinc-300 shrink-0 -mt-1 -mr-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Steps */}
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, idx) => {
            const done = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border p-5 transition-all duration-200",
                  done
                    ? "border-green-500/30 bg-green-500/5"
                    : `${step.borderColor} ${step.bgColor} hover:border-zinc-600`
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                      done
                        ? "bg-green-500/20 text-green-400"
                        : `${step.bgColor} ${step.color}`
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <step.icon className={cn("h-4 w-4", done ? "text-green-400" : step.color)} />
                </div>
                <h3
                  className={cn(
                    "font-semibold text-sm mb-1",
                    done ? "text-green-300" : "text-white"
                  )}
                >
                  {step.title}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                  {step.description}
                </p>
                <Link
                  href={step.href}
                  onClick={() =>
                    setCompletedSteps((prev) =>
                      prev.includes(step.id) ? prev : [...prev, step.id]
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
                    done
                      ? "text-green-400 bg-green-500/10 hover:bg-green-500/20"
                      : `${step.color} ${step.bgColor} hover:opacity-80`
                  )}
                >
                  {done ? "Done" : step.cta}
                  {!done && <ArrowRight className="h-3 w-3" />}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Features teaser */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-600" />
            AI resume tailoring
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-zinc-600" />
            Cover letter generation
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-600" />
            300+ job sources
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { apiPost, apiDelete, apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type { GeneratedCoverLetter, CoverLetterTone } from "@/types";
import { PenTool, Copy, Download, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_OPTIONS: Array<{ value: CoverLetterTone; label: string }> = [
  { value: "professional", label: "Professional" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
];

function CoverLetterPageContent() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLetter, setCurrentLetter] = useState<GeneratedCoverLetter | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: history, mutate: mutateHistory } = useSWR<GeneratedCoverLetter[]>(
    "/cover-letter/history",
    () => apiGet<GeneratedCoverLetter[]>("/cover-letter/history"),
    { revalidateOnFocus: false }
  );

  const handleGenerate = useCallback(async () => {
    if (!jobTitle.trim() && !company.trim()) {
      toast.error("Please enter at least a job title or company name");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await apiPost<GeneratedCoverLetter>("/cover-letter/generate", {
        job_title: jobTitle,
        company: company,
        job_description: jobDescription,
        resume_text: resumeText,
        tone: tone,
        instructions: instructions,
      });

      setCurrentLetter(result);
      void mutateHistory();
      toast.success("Cover letter generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setIsGenerating(false);
    }
  }, [jobTitle, company, jobDescription, resumeText, tone, instructions, mutateHistory]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!currentLetter) return;
    try {
      await navigator.clipboard.writeText(currentLetter.content);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [currentLetter]);

  const handleDownload = useCallback(() => {
    if (!currentLetter) return;
    const element = document.createElement("a");
    const file = new Blob([currentLetter.content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `cover-letter-${currentLetter.company || "letter"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Cover letter downloaded!");
  }, [currentLetter]);

  const handleDeleteLetter = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeletingId(id);
      try {
        await apiDelete(`/cover-letter/${encodeURIComponent(id)}`);
        await mutateHistory();
        setCurrentLetter((cur) => (cur?.id === id ? null : cur));
        toast.success("Cover letter removed from history");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete cover letter");
      } finally {
        setDeletingId(null);
      }
    },
    [mutateHistory]
  );

  const reversedHistory = useMemo(() => {
    if (!history) return [];
    return [...history].reverse();
  }, [history]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <PenTool aria-hidden="true" className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">AI Cover Letter Generator</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Generate personalized cover letters tailored to specific job opportunities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Form */}
        <div className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Cover Letter Details</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="cl-job-title" className="block text-sm font-medium text-zinc-300 mb-1">
                  Job Title
                </label>
                <Input
                  id="cl-job-title"
                  name="job_title"
                  autoComplete="off"
                  placeholder="e.g., Senior Data Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>

              <div>
                <label htmlFor="cl-company" className="block text-sm font-medium text-zinc-300 mb-1">Company</label>
                <Input
                  id="cl-company"
                  name="company"
                  autoComplete="off"
                  placeholder="e.g., Databricks"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>

              <div>
                <label htmlFor="cl-job-description" className="block text-sm font-medium text-zinc-300 mb-1">
                  Job Description
                </label>
                <Textarea
                  id="cl-job-description"
                  name="job_description"
                  placeholder="Paste the job description here…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={4}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                />
              </div>

              <div>
                <label htmlFor="cl-resume-text" className="block text-sm font-medium text-zinc-300 mb-1">
                  Your Resume/Background
                </label>
                <Textarea
                  id="cl-resume-text"
                  name="resume_text"
                  placeholder="Paste your resume or background information…"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={4}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                />
              </div>

              <div>
                <label htmlFor="cl-tone" className="block text-sm font-medium text-zinc-300 mb-1">Tone</label>
                <Select value={tone} onValueChange={(v) => setTone(v as CoverLetterTone)}>
                  <SelectTrigger id="cl-tone" className="bg-zinc-950 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="cl-instructions" className="block text-sm font-medium text-zinc-300 mb-1">
                  Special Instructions (Optional)
                </label>
                <Textarea
                  id="cl-instructions"
                  name="instructions"
                  placeholder="Any specific points to emphasize or style preferences…"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                aria-busy={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    Generate Cover Letter
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Panel: Preview and History */}
        <div className="space-y-6">
          {/* Preview */}
          {currentLetter && (
            <Card className="bg-zinc-900 border-zinc-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Generated Letter</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToClipboard}
                    aria-label="Copy cover letter to clipboard"
                    className="text-zinc-400 hover:text-white"
                  >
                    <Copy aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    aria-label="Download cover letter as text file"
                    className="text-zinc-400 hover:text-white"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-zinc-950 border border-zinc-700 rounded p-4 max-h-96 overflow-y-auto">
                <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {currentLetter.content}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                  Tone: <span className="capitalize text-zinc-300">{currentLetter.tone}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(currentLetter.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          )}

          {/* History */}
          {history && history.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-700 p-6">
              <h3 id="cl-history-heading" className="text-lg font-semibold text-white mb-4">History</h3>
              <ul aria-labelledby="cl-history-heading" className="space-y-2 max-h-96 overflow-y-auto list-none p-0">
                {reversedHistory.map((letter) => {
                  const titleText = letter.company || letter.job_title || "Untitled";
                  const isActive = currentLetter?.id === letter.id;
                  return (
                    <li
                      key={letter.id}
                      className={cn(
                        "flex gap-1 items-stretch rounded border transition-colors",
                        isActive
                          ? "bg-blue-600/20 border-blue-600/50"
                          : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentLetter(letter)}
                        aria-pressed={isActive}
                        aria-label={`Load cover letter: ${titleText}${isActive ? " (currently selected)" : ""}`}
                        className="flex-1 min-w-0 text-left p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {titleText}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {letter.job_title && letter.company
                            ? `${letter.job_title} at ${letter.company}`
                            : letter.job_title || letter.company || "No details"}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-zinc-500">
                            {new Date(letter.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 capitalize">
                            {letter.tone}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLetter(e, letter.id)}
                        disabled={deletingId === letter.id}
                        aria-busy={deletingId === letter.id}
                        aria-label={`Delete cover letter for ${titleText}`}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {!currentLetter && !history?.length && (
            <Card className="bg-zinc-900 border-zinc-700 border-dashed p-8 text-center">
              <PenTool aria-hidden="true" className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                Generate your first cover letter to see it here
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoverLetterPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <CoverLetterPageContent />
    </div>
  );
}

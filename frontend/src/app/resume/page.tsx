"use client";
import { ResumeUpload } from "@/components/resume/resume-upload";
import { JdInput } from "@/components/resume/jd-input";
import { ResumePreview } from "@/components/resume/resume-preview";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, isResumeApiConfigured } from "@/lib/api";
import {
  loadSampleResumesForBuilder,
  SAMPLE_JOB_DESCRIPTION_FOR_BUILDER,
} from "@/lib/demo-data";
import { consumeResumeHandoff } from "@/lib/tracker-handoff";
import { ResumeReviewPanel } from "@/components/resume/resume-review-panel";
import type { Resume, GeneratedDocument, ResumeReview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileStack, Info, Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";

export default function ResumePage() {
  const { data: resumes, mutate } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false }
  );

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [tailoringInstructions, setTailoringInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const liveApi = isResumeApiConfigured();
  const [demoHintDismissed, setDemoHintDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("autoappli-resume-demo-hint-dismissed") === "1") {
        setDemoHintDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    const handoff = consumeResumeHandoff();
    if (!handoff) return;
    setJobDescription(handoff.description);
    setGenerated(null);
    const label = [handoff.title, handoff.company].filter(Boolean).join(" · ");
    toast.success(label ? `Loaded from tracker: ${label}` : "Loaded job context from tracker");
  }, []);

  const handleLoadSample = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION_FOR_BUILDER);
    setGenerated(null);
    if (liveApi) {
      toast.success("Loaded sample job description — pick a resume from your API list to generate");
      return;
    }
    const next = loadSampleResumesForBuilder();
    void mutate();
    if (next[0]) {
      setSelectedResumeId(next[0].id);
    }
    toast.success("Loaded sample resumes and job description");
  };

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume first");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please enter a job description");
      return;
    }
    setGenerating(true);
    try {
      const selected = resumes?.find((r) => r.id === selectedResumeId);
      const result = await apiPost<GeneratedDocument>("/resumes/generate", {
        resume_id: selectedResumeId,
        job_description: jobDescription,
        resume_text: selected?.parsed_text ?? "",
        instructions: tailoringInstructions.trim(),
        include_pdf: liveApi,
      });
      setGenerated(result);
      toast.success(
        liveApi ? "Tailored resume generated!" : "Demo output ready (set API URL for real AI)"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate resume");
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume first");
      return;
    }
    const selected = resumes?.find((r) => r.id === selectedResumeId);
    const text = (selected?.parsed_text ?? "").trim();
    if (!text) {
      toast.error("No resume text to review for this item");
      return;
    }
    setReviewing(true);
    try {
      const result = await apiPost<ResumeReview>("/resumes/review", {
        resume_id: selectedResumeId,
        resume_text: text,
      });
      setReview(result);
      toast.success(liveApi ? "Review ready" : "Demo review loaded — connect API for full analysis");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to get review");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Resume Builder</h1>
        <p className="text-zinc-300 text-sm mt-1">
          Upload your resume and paste a job description to get an AI-tailored version
        </p>
        {!liveApi && !demoHintDismissed ? (
          <div
            className="mt-4 flex items-start gap-3 rounded-xl border-2 border-amber-500/80 bg-zinc-950 px-4 py-3 shadow-md ring-1 ring-amber-400/25"
            role="status"
          >
            <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-base font-semibold text-amber-200 tracking-tight">Demo mode</p>
              <p className="text-sm text-zinc-100 leading-relaxed">
                Add{" "}
                <code className="rounded-md border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[13px] font-mono text-amber-200">
                  NEXT_PUBLIC_API_URL
                </code>{" "}
                pointing at your FastAPI base URL (optional <code className="rounded border border-zinc-600 bg-zinc-900 px-1 py-0.5 text-[12px] font-mono text-amber-200">/api/v1</code>
                ) so PDF upload, tailoring, and Claude run against your backend.
              </p>
              <p className="text-xs leading-snug text-zinc-300">
                <span className="font-medium text-zinc-200">Local dev:</span>{" "}
                <code className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-100">frontend/.env.local</code>
                <span className="mx-1.5 text-zinc-500">·</span>
                <span className="font-medium text-zinc-200">Vercel:</span> Project → Settings → Environment Variables → redeploy
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem("autoappli-resume-demo-hint-dismissed", "1");
                } catch {
                  /* ignore */
                }
                setDemoHintDismissed(true);
              }}
              className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Dismiss demo hint"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-600 text-zinc-200"
            onClick={handleLoadSample}
          >
            <FileStack className="h-4 w-4 mr-2" />
            Load sample (resumes + JD)
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ResumeUpload
            resumes={resumes || []}
            selectedId={selectedResumeId}
            onSelect={setSelectedResumeId}
            onUploadComplete={mutate}
          />
          <JdInput value={jobDescription} onChange={setJobDescription} />
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Tailoring notes (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={tailoringInstructions}
                onChange={(e) => setTailoringInstructions(e.target.value)}
                placeholder="e.g. Emphasize cloud experience; keep the resume to one page tone; target a senior IC role…"
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
              />
            </CardContent>
          </Card>
          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedResumeId || !jobDescription.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
          >
            {generating ? (
              "Generating tailored resume..."
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Tailored Resume
              </>
            )}
          </Button>
          <ResumeReviewPanel
            review={review}
            loading={reviewing}
            disabled={!selectedResumeId || !(resumes?.find((r) => r.id === selectedResumeId)?.parsed_text ?? "").trim()}
            onRequestReview={handleReview}
          />
        </div>
        <div>
          <ResumePreview document={generated} />
        </div>
      </div>
    </div>
  );
}

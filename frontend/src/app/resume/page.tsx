"use client";
import { ResumeUpload } from "@/components/resume/resume-upload";
import { ResumeTextPaste } from "@/components/resume/resume-text-paste";
import { JdInput } from "@/components/resume/jd-input";
import { ResumePreview } from "@/components/resume/resume-preview";
import { ResumeComparison } from "@/components/resume/resume-comparison";
import { ResumeDownload } from "@/components/resume/resume-download";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPost, isJobsApiConfigured } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadSampleResumesForBuilder,
  SAMPLE_JOB_DESCRIPTION_FOR_BUILDER,
} from "@/lib/demo-data";
import { consumeResumeHandoff, tailoringTextFromJob } from "@/lib/tracker-handoff";
import { ResumeReviewPanel } from "@/components/resume/resume-review-panel";
import { KeywordMatch } from "@/components/resume/keyword-match";
import type { Job, Resume, GeneratedDocument, ResumeReview, SavedTailoredDocument } from "@/types";
import { EvalScoreCard } from "@/components/resume/eval-score-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileStack, History, Info, Sparkles, Trash2, X } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

function ResumeBuilderContent() {
  const { data: resumes, mutate } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false }
  );

  const { data: savedGenerated, mutate: mutateSavedGenerated } = useSWR<SavedTailoredDocument[]>(
    "/resumes/generated",
    () => apiGet<SavedTailoredDocument[]>("/resumes/generated"),
    { revalidateOnFocus: false }
  );

  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [tailoringInstructions, setTailoringInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [review, setReview] = useState<ResumeReview | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const searchParams = useSearchParams();
  const liveApi = isSupabaseConfigured();
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
    const jobId = searchParams.get("jobId");

    const applySessionHandoff = () => {
      const handoff = consumeResumeHandoff();
      if (!handoff) return;
      setJobDescription(handoff.description);
      setGenerated(null);
      const label = [handoff.title, handoff.company].filter(Boolean).join(" · ");
      toast.success(label ? `Loaded from tracker: ${label}` : "Loaded job context from tracker");
    };

    if (jobId && isJobsApiConfigured()) {
      let cancelled = false;
      void apiGet<Job>(`/jobs/${encodeURIComponent(jobId)}`)
        .then((job) => {
          if (cancelled) return;
          setJobDescription(tailoringTextFromJob(job));
          setGenerated(null);
          const label = [job.title, job.company].filter(Boolean).join(" · ");
          toast.success(label ? `Loaded from tracker: ${label}` : "Loaded role from tracker");
        })
        .catch(() => {
          if (cancelled) return;
          applySessionHandoff();
        });
      return () => {
        cancelled = true;
      };
    }

    applySessionHandoff();
  }, [searchParams]);

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

  const handlePastedResume = (resume: Resume) => {
    void mutate();
    setSelectedResumeId(resume.id);
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
        include_pdf: true,
      });
      setGenerated(result);
      void mutateSavedGenerated();
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
      toast.error("No resume text to review — try the paste option if PDF extraction failed");
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

  const selectedResume = resumes?.find((r) => r.id === selectedResumeId);
  const selectedResumeText = (selectedResume?.parsed_text ?? "").trim();
  const hasExtractedText = selectedResumeText.length > 50 && !selectedResumeText.startsWith("[PDF text extraction");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Resume Builder</h1>
        <p className="text-zinc-300 text-sm mt-1 max-w-2xl leading-relaxed">
          Upload your resume (or paste the text), add a job description, and get an AI-tailored resume
          with keyword optimization and ATS scoring.
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
                Connect Supabase to persist your data. Set{" "}
                <code className="rounded-md border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[13px] font-mono text-amber-200">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded-md border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-[13px] font-mono text-amber-200">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                to enable PDF upload, resume tailoring, and AI features.
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
          <ResumeTextPaste onSave={handlePastedResume} />
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

          {/* Keyword Match — shows before generating */}
          {selectedResumeId && jobDescription.trim() && hasExtractedText && (
            <KeywordMatch
              resumeText={selectedResumeText}
              jobDescription={jobDescription}
            />
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedResumeId || !jobDescription.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base"
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
          </div>

          <ResumeReviewPanel
            review={review}
            loading={reviewing}
            disabled={!selectedResumeId || !hasExtractedText}
            onRequestReview={handleReview}
          />

          {savedGenerated && savedGenerated.length > 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-400" aria-hidden />
                  Saved tailored resumes
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  Text only (regenerate for a new PDF). Newest first.
                </p>
              </CardHeader>
              <CardContent className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {savedGenerated.map((s) => (
                  <div
                    key={s.id}
                    className="flex gap-1 items-stretch rounded-lg border border-zinc-800 bg-zinc-950/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setGenerated({
                          id: s.id,
                          doc_type: "tailored_resume",
                          content: s.content,
                          storage_path: "",
                          download_url: "",
                          pdf_base64: null,
                        })
                      }
                      className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-zinc-900/80 transition-colors"
                    >
                      <p className="text-sm text-zinc-100 line-clamp-2">{s.title || "Tailored resume"}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      title="Remove from saved list"
                      aria-label="Remove from saved list"
                      className="shrink-0 px-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 border-l border-zinc-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        void (async () => {
                          try {
                            await apiDelete(`/resumes/generated/${encodeURIComponent(s.id)}`);
                            if (generated?.id === s.id) {
                              setGenerated(null);
                            }
                            void mutateSavedGenerated();
                            toast.success("Removed from saved list");
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : "Could not delete");
                          }
                        })();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <ResumePreview document={generated} />
          {/* Download buttons for generated resume */}
          {generated?.content && (
            <ResumeDownload content={generated.content} />
          )}
          {/* Before/After comparison */}
          {generated?.content && hasExtractedText && (
            <ResumeComparison
              originalText={selectedResumeText}
              tailoredText={generated.content}
            />
          )}
          {generated?.eval_result && (
            <EvalScoreCard eval_result={generated.eval_result} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense
      fallback={
        <div className="text-zinc-400 p-6 text-sm" role="status">
          Loading resume builder…
        </div>
      }
    >
      <ResumeBuilderContent />
    </Suspense>
  );
}

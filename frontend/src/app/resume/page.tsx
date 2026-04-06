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
import type { Resume, GeneratedDocument } from "@/types";
import { FileStack, Sparkles } from "lucide-react";
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
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);

  const liveApi = isResumeApiConfigured();

  useEffect(() => {
    if (resumes && resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Resume Builder</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Upload your resume and paste a job description to get an AI-tailored version
        </p>
        {!liveApi ? (
          <p className="text-amber-200/90 text-sm mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <strong className="font-medium">Demo mode:</strong>{" "}
            <code className="text-amber-100/90">NEXT_PUBLIC_API_URL</code> is not set. Upload
            uses a placeholder; generate shows stub text. Set the env var to your deployed API
            for real PDF parsing and Claude output.
          </p>
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
        </div>
        <div>
          <ResumePreview document={generated} />
        </div>
      </div>
    </div>
  );
}

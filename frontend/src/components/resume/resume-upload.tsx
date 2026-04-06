"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPostFormData } from "@/lib/api";
import type { Resume } from "@/types";
import { Upload, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { resumes: Resume[]; selectedId: string | null; onSelect: (id: string) => void; onUploadComplete: () => void; }

export function ResumeUpload({ resumes, selectedId, onSelect, onUploadComplete }: Props) {
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Only PDF files are accepted"); return; }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await apiPostFormData<Resume>("/resumes/upload", formData);
      toast.success("Resume uploaded successfully");
      onSelect(result.id);
      onUploadComplete();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }, [onSelect, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/pdf": [".pdf"] }, maxFiles: 1, maxSize: 10 * 1024 * 1024 });

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader><CardTitle className="text-white text-lg">Your Resumes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors", isDragActive ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 hover:border-zinc-500")}>
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-2" />
          <p className="text-sm text-zinc-400">{isDragActive ? "Drop your resume here" : "Drag & drop a PDF resume, or click to browse"}</p>
          <p className="text-xs text-zinc-600 mt-1">Max 10MB</p>
        </div>
        {resumes.length > 0 && (<div className="space-y-2">
          {resumes.map((r) => (
            <button key={r.id} onClick={() => onSelect(r.id)}
              className={cn("w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors", selectedId === r.id ? "bg-blue-600/10 border border-blue-500/30" : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent")}>
              <FileText className="h-5 w-5 text-zinc-400 shrink-0" />
              <div className="min-w-0 flex-1"><p className="text-sm text-white truncate">{r.file_name}</p><p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</p></div>
              {selectedId === r.id && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
            </button>
          ))}
        </div>)}
      </CardContent>
    </Card>
  );
}

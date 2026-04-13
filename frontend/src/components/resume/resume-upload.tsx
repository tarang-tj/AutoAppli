"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiPostFormData, apiDelete } from "@/lib/api";
import type { Resume } from "@/types";
import { Upload, FileText, Check, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  resumes: Resume[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUploadComplete: () => void;
}

export function ResumeUpload({ resumes, selectedId, onSelect, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const result = await apiPostFormData<Resume>("/resumes/upload", formData);
      const charCount = (result.parsed_text || "").trim().length;
      if (charCount > 50) {
        toast.success(`Resume uploaded — ${charCount.toLocaleString()} characters extracted`);
      } else {
        toast.warning("Resume uploaded but text extraction returned very little content. The PDF may be image-based.");
      }
      onSelect(result.id);
      onUploadComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onSelect, onUploadComplete]);

  const handleDelete = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    setDeleting(resumeId);
    try {
      await apiDelete(`/resumes/${encodeURIComponent(resumeId)}`);
      if (selectedId === resumeId) {
        const remaining = resumes.filter((r) => r.id !== resumeId);
        onSelect(remaining[0]?.id ?? "");
      }
      onUploadComplete();
      toast.success("Resume deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white text-lg">Your Resumes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            uploading && "opacity-60 pointer-events-none",
            isDragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-700 hover:border-zinc-500"
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto text-blue-400 mb-2 animate-spin" />
              <p className="text-sm text-blue-300">Uploading and extracting text...</p>
              <p className="text-xs text-zinc-500 mt-1">This may take a few seconds</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-zinc-500 mb-2" />
              <p className="text-sm text-zinc-400">
                {isDragActive ? "Drop your resume here" : "Drag & drop a PDF resume, or click to browse"}
              </p>
              <p className="text-xs text-zinc-600 mt-1">Max 10MB</p>
            </>
          )}
        </div>

        {resumes.length > 0 && (
          <div className="space-y-2">
            {resumes.map((r) => {
              const textLen = (r.parsed_text || "").trim().length;
              const isSelected = selectedId === r.id;
              const showingPreview = previewId === r.id;

              return (
                <div key={r.id} className="space-y-0">
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-blue-600/10 border border-blue-500/30"
                        : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent",
                      showingPreview && "rounded-b-none"
                    )}
                    onClick={() => onSelect(r.id)}
                  >
                    <FileText className="h-5 w-5 text-zinc-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{r.file_name}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(r.created_at).toLocaleDateString()}
                        {textLen > 0 && (
                          <span className="ml-2 text-zinc-600">
                            {textLen.toLocaleString()} chars
                          </span>
                        )}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
                    <button
                      type="button"
                      title="Preview extracted text"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewId(showingPreview ? null : r.id);
                      }}
                      className="shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                      {showingPreview ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Delete resume"
                      disabled={deleting === r.id}
                      onClick={(e) => handleDelete(e, r.id)}
                      className="shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                      {deleting === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {showingPreview && (
                    <div className="rounded-b-lg border border-t-0 border-zinc-700 bg-zinc-950 px-3 py-2 max-h-48 overflow-y-auto">
                      {textLen > 0 ? (
                        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {r.parsed_text.slice(0, 2000)}
                          {textLen > 2000 && (
                            <span className="text-zinc-600">
                              {"\n\n"}... ({(textLen - 2000).toLocaleString()} more characters)
                            </span>
                          )}
                        </pre>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">
                          No text extracted. This PDF may be image-based or empty.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

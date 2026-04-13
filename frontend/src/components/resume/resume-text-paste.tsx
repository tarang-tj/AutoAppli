"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardPaste, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Resume } from "@/types";

interface Props {
  onSave: (resume: Resume) => void;
}

export function ResumeTextPaste({ onSave }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 50) {
      toast.error("Please paste at least 50 characters of resume text");
      return;
    }
    setSaving(true);
    try {
      if (isSupabaseConfigured()) {
        // Dynamic import to avoid circular dependency
        const { createResume } = await import("@/lib/supabase/resumes");
        const row = await createResume({
          file_name: "Pasted resume text",
          storage_path: "manual/pasted-resume.txt",
          parsed_text: trimmed,
        });
        const resume: Resume = {
          id: row.id,
          file_name: row.file_name,
          storage_path: row.storage_path,
          parsed_text: row.parsed_text,
          is_primary: row.is_primary,
          created_at: row.created_at,
        };
        onSave(resume);
        toast.success(`Resume saved — ${trimmed.length.toLocaleString()} characters`);
        setText("");
        setExpanded(false);
      } else {
        // Demo mode — create in-memory resume
        const resume: Resume = {
          id: `resume-paste-${Date.now()}`,
          file_name: "Pasted resume text",
          storage_path: "manual/pasted-resume.txt",
          parsed_text: trimmed,
          is_primary: false,
          created_at: new Date().toISOString(),
        };
        onSave(resume);
        toast.success("Resume saved (demo mode)");
        setText("");
        setExpanded(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
      >
        <ClipboardPaste className="h-4 w-4" />
        PDF not working? Paste your resume text instead
      </button>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-blue-400" />
          Paste Resume Text
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Copy your resume content from a Word doc or other source and paste it here.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your full resume text here..."
          rows={8}
          className="bg-zinc-800 border-zinc-700 text-white resize-y font-mono text-xs leading-relaxed"
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || text.trim().length < 50}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save as Resume
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => { setExpanded(false); setText(""); }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
          {text.trim().length > 0 && (
            <span className="text-xs text-zinc-600 ml-auto">
              {text.trim().length.toLocaleString()} chars
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

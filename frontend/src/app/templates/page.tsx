"use client";

import { useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { DocTemplate } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FileStack,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useSWR from "swr";

// ── Configuration ────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  tech: { label: "Technology", color: "text-blue-400", bg: "bg-blue-400/10" },
  finance: { label: "Finance", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  general: { label: "General", color: "text-zinc-400", bg: "bg-zinc-400/10" },
  creative: { label: "Creative", color: "text-purple-400", bg: "bg-purple-400/10" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  resume: { label: "Resume", icon: <FileStack className="h-4 w-4" aria-hidden="true" /> },
  cover_letter: { label: "Cover Letter", icon: <FileStack className="h-4 w-4" aria-hidden="true" /> },
};

function CategoryBadge({ cat }: { cat: string }) {
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type as "resume" | "cover_letter"] || TYPE_CONFIG.resume;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── New template form ────────────────────────────────────────────

function NewTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("resume");
  const [category, setCategory] = useState("general");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/templates", {
        name,
        template_type: type,
        category,
        content,
        is_default: false,
      });
      setName("");
      setType("resume");
      setCategory("general");
      setContent("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" aria-hidden="true" /> New Template
      </Button>
    );
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Create New Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
          <div>
            <label htmlFor="new-template-name" className="text-xs text-zinc-400 block mb-1">Template Name *</label>
            <Input
              id="new-template-name"
              name="template_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Tech Resume"
              autoComplete="off"
              spellCheck={false}
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-template-type" className="text-xs text-zinc-400 block mb-1">Type</label>
              <select
                id="new-template-type"
                name="template_type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover Letter</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-template-category" className="text-xs text-zinc-400 block mb-1">Category</label>
              <select
                id="new-template-category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <option value="tech">Technology</option>
                <option value="finance">Finance</option>
                <option value="general">General</option>
                <option value="creative">Creative</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-template-content" className="text-xs text-zinc-400 block mb-1">
              {"Content * (use {{placeholder}} for variables)"}
            </label>
            <Textarea
              id="new-template-content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Dear {{hiring_manager}}, I am writing to apply for the {{role}} position at {{company}}…"}
              rows={8}
              autoComplete="off"
              className="bg-zinc-800 border-zinc-700 text-sm"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              {"Use {{variable_name}} syntax for placeholders. Example: {{name}}, {{company}}, {{role}}"}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName("");
                setType("resume");
                setCategory("general");
                setContent("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Template card ────────────────────────────────────────────────

function TemplateCard({ template, onRefresh }: { template: DocTemplate; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [editContent, setEditContent] = useState(template.content);
  const [showRender, setShowRender] = useState(false);
  const [renderVars, setRenderVars] = useState<Record<string, string>>({});
  const [renderedContent, setRenderedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Extract placeholders from content
  const placeholders = Array.from(
    new Set((template.content.match(/\{\{([^}]+)\}\}/g) || []).map((p) => p.slice(2, -2)))
  );

  async function handleSave() {
    setSaving(true);
    try {
      await apiPatch(`/templates/${template.id}`, {
        name: editName,
        content: editContent,
      });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${template.name}"?`)) return;
    setDeleting(true);
    try {
      await apiDelete(`/templates/${template.id}`);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleRender() {
    if (!Object.keys(renderVars).length && placeholders.length > 0) {
      alert("Please fill in at least one variable");
      return;
    }
    try {
      const res = await apiPost(`/templates/${template.id}/render`, { variables: renderVars }) as { rendered_content: string };
      setRenderedContent(res.rendered_content);
    } catch (err) {
      alert("Failed to render template");
    }
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base mb-2">{template.name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <TypeBadge type={template.template_type} />
              <CategoryBadge cat={template.category} />
              {template.is_default && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-400">
                  Default
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-400 hover:text-white"
            aria-expanded={expanded}
            aria-controls={`template-${template.id}-panel`}
            aria-label={expanded ? `Collapse template "${template.name}"` : `Expand template "${template.name}"`}
          >
            {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent id={`template-${template.id}-panel`} className="space-y-4">
          {!editing && (
            <>
              <div>
                <p className="text-xs text-zinc-400 mb-2">Preview</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                  {template.content.slice(0, 300)}
                  {template.content.length > 300 ? "…" : ""}
                </p>
              </div>

              {placeholders.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-400 mb-2">Variables</p>
                  <div className="flex flex-wrap gap-1">
                    {placeholders.map((p) => (
                      <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300">
                        {"{{" + p + "}}"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {editing && (
            <div className="space-y-3">
              <div>
                <label htmlFor={`template-${template.id}-edit-name`} className="text-xs text-zinc-400 block mb-1">Name</label>
                <Input
                  id={`template-${template.id}-edit-name`}
                  name="template_name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label htmlFor={`template-${template.id}-edit-content`} className="text-xs text-zinc-400 block mb-1">Content</label>
                <Textarea
                  id={`template-${template.id}-edit-content`}
                  name="content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  autoComplete="off"
                  className="bg-zinc-800 border-zinc-700 text-sm"
                />
              </div>
            </div>
          )}

          {showRender && (
            <div id={`template-${template.id}-render`} className="space-y-3 border-t border-zinc-700 pt-4">
              <p className="text-xs text-zinc-400">Fill in variables to render</p>
              {placeholders.map((p) => {
                const fieldId = `template-${template.id}-var-${p}`;
                return (
                  <div key={p}>
                    <label htmlFor={fieldId} className="text-xs text-zinc-400 block mb-1">{"{{" + p + "}}"}</label>
                    <Input
                      id={fieldId}
                      name={p}
                      value={renderVars[p] || ""}
                      onChange={(e) => setRenderVars({ ...renderVars, [p]: e.target.value })}
                      placeholder={`Enter ${p}`}
                      autoComplete="off"
                      className="bg-zinc-800 border-zinc-700 text-sm"
                    />
                  </div>
                );
              })}
              {renderedContent && (
                <div>
                  <p className="text-xs text-zinc-400 mb-2">Rendered Output</p>
                  <div className="bg-zinc-800 p-3 rounded text-sm text-zinc-200 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                    {renderedContent}
                  </div>
                </div>
              )}
              <Button onClick={handleRender} className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
                Render Preview
              </Button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-2 border-t border-zinc-700">
            {!editing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRender(!showRender)}
                  aria-expanded={showRender}
                  aria-controls={`template-${template.id}-render`}
                  className="gap-1.5"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" /> Use Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  aria-label={`Edit template "${template.name}"`}
                  className="gap-1.5"
                >
                  <Edit2 className="h-4 w-4" aria-hidden="true" /> Edit
                </Button>
              </>
            )}
            {editing && (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  aria-busy={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              aria-busy={deleting}
              aria-label={`Delete template "${template.name}"`}
              className="gap-1.5 text-red-400 hover:text-red-300 border-red-400/20"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { data: templates = [], mutate: refresh } = useSWR("/templates", () =>
    apiGet<DocTemplate[]>("/templates")
  );

  const resumes = templates.filter((t) => t.template_type === "resume");
  const coverLetters = templates.filter((t) => t.template_type === "cover_letter");

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileStack className="h-8 w-8 text-blue-400" aria-hidden="true" />
              Document Templates
            </h1>
            <p className="text-zinc-400 mt-1">
              Save and reuse templates for resumes and cover letters
            </p>
          </div>
          <NewTemplateForm onCreated={refresh} />
        </div>

        {templates.length === 0 ? (
          <Card className="border-zinc-700 bg-zinc-900 text-center py-12">
            <FileStack className="h-12 w-12 text-zinc-600 mx-auto mb-3" aria-hidden="true" />
            <p className="text-zinc-400">No templates yet. Create your first one!</p>
          </Card>
        ) : (
          <>
            {/* Resume Templates */}
            {resumes.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-zinc-200">Resume Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resumes.map((t) => (
                    <TemplateCard key={t.id} template={t} onRefresh={refresh} />
                  ))}
                </div>
              </div>
            )}

            {/* Cover Letter Templates */}
            {coverLetters.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-zinc-200">Cover Letter Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coverLetters.map((t) => (
                    <TemplateCard key={t.id} template={t} onRefresh={refresh} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

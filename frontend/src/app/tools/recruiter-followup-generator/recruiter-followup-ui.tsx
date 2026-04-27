"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  generateAllFollowUps,
  PATTERN_META,
  type FollowUpPattern,
  type FollowUpInputs,
  type FollowUpEmail,
} from "@/lib/tools/recruiter-followup-templates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = "autoappli_recruiter_followup_v1";

const PATTERNS: FollowUpPattern[] = [
  "post-application",
  "post-interview",
  "ghosted-nudge",
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

// ---------------------------------------------------------------------------
// TextInput sub-component
// ---------------------------------------------------------------------------

interface TextInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function TextInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
}: TextInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-300 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyButton sub-component
// ---------------------------------------------------------------------------

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — silently ignore.
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : `Copy ${label} to clipboard`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100 ${FOCUS_RING}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pattern picker pill tabs
// ---------------------------------------------------------------------------

interface PatternTabsProps {
  selected: FollowUpPattern;
  onChange: (p: FollowUpPattern) => void;
}

function PatternTabs({ selected, onChange }: PatternTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Follow-up pattern"
      className="flex flex-col sm:flex-row gap-2"
    >
      {PATTERNS.map((p) => {
        const meta = PATTERN_META[p];
        const active = selected === p;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p)}
            className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
              active
                ? "border-blue-500/60 bg-blue-500/10 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-300"
            }`}
          >
            <span className="block text-sm font-medium">{meta.label}</span>
            <span className="block text-xs mt-0.5 text-zinc-500">
              {meta.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single email output card (editable subject + body)
// ---------------------------------------------------------------------------

interface EmailCardProps {
  email: FollowUpEmail;
}

function EmailCard({ email }: EmailCardProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [expanded, setExpanded] = useState(true);

  // Reset when email content changes (new generation or pattern switch)
  useEffect(() => {
    setSubject(email.subject);
    setBody(email.body);
    setExpanded(true);
  }, [email.subject, email.body]);

  const fullText = `Subject: ${subject}\n\n${body}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-800/40 ${FOCUS_RING}`}
        aria-expanded={expanded}
      >
        <div>
          <span className="text-sm font-semibold text-zinc-100">
            {email.patternLabel}
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
            {email.patternDescription}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-zinc-800">
          {/* Subject line */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`subject-${email.id}`}
                className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
              >
                Subject line
              </label>
              <CopyButton text={subject} label="subject" />
            </div>
            <input
              id={`subject-${email.id}`}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Email body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`body-${email.id}`}
                className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
              >
                Email body
              </label>
              <CopyButton text={body} label="body" />
            </div>
            <textarea
              id={`body-${email.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Copy full email */}
          <div className="flex justify-end">
            <CopyButton text={fullText} label="full email" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export default function RecruiterFollowupUI() {
  const [yourName, setYourName] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [company, setCompany] = useState("");
  const [detail, setDetail] = useState("");
  const [pattern, setPattern] = useState<FollowUpPattern>("post-application");
  const [emails, setEmails] = useState<FollowUpEmail[]>([]);
  const [generated, setGenerated] = useState(false);

  // Restore sender name from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setYourName(saved);
    } catch {
      // localStorage unavailable — continue silently.
    }
  }, []);

  // Persist sender name whenever it changes
  useEffect(() => {
    if (!yourName) return;
    try {
      localStorage.setItem(LS_KEY, yourName);
    } catch {
      // Silently ignore storage errors.
    }
  }, [yourName]);

  const requiredFilled =
    yourName.trim() &&
    recruiterName.trim() &&
    roleTitle.trim() &&
    company.trim();

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredFilled) return;
    const inputs: FollowUpInputs = {
      yourName: yourName.trim(),
      recruiterName: recruiterName.trim(),
      roleTitle: roleTitle.trim(),
      company: company.trim(),
      detail: detail.trim(),
    };
    setEmails(generateAllFollowUps(inputs));
    setGenerated(true);
  }

  // When pattern tab changes after generation, filter displayed email
  const displayedEmail = emails.find((e) => e.pattern === pattern) ?? null;

  return (
    <div className="mt-8 space-y-8">
      {/* Input form */}
      <form onSubmit={handleGenerate} noValidate className="space-y-5">
        {/* Pattern selector */}
        <div>
          <p className="block text-sm font-medium text-zinc-300 mb-2">
            Follow-up type
          </p>
          <PatternTabs selected={pattern} onChange={setPattern} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="your-name"
            label="Your name"
            placeholder="e.g. Jordan Lee"
            value={yourName}
            onChange={setYourName}
            hint="Remembered in your browser for next time."
          />
          <TextInput
            id="recruiter-name"
            label="Recruiter's name"
            placeholder="e.g. Sarah Chen"
            value={recruiterName}
            onChange={setRecruiterName}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="role-title"
            label="Role title"
            placeholder="e.g. Software Engineering Intern"
            value={roleTitle}
            onChange={setRoleTitle}
          />
          <TextInput
            id="company"
            label="Company"
            placeholder="e.g. Stripe"
            value={company}
            onChange={setCompany}
          />
        </div>

        <div>
          <label
            htmlFor="detail"
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Specific detail{" "}
            <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              pattern === "post-interview"
                ? "e.g. Loved your point about how the team approaches observability at scale — it stuck with me."
                : pattern === "post-application"
                ? "e.g. I noticed the team recently open-sourced their data pipeline, which is directly related to my senior project."
                : "e.g. I'm still following the team's work closely and recently read your engineering blog post on latency tradeoffs."
            }
            rows={3}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y text-sm leading-relaxed"
          />
          <p className="mt-1 text-xs text-zinc-500">
            One sentence that makes this feel personal — an interview topic, a
            company detail, or a mutual contact. Nothing leaves your browser.
          </p>
        </div>

        <button
          type="submit"
          disabled={!requiredFilled}
          className={`w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-blue-600/20 ${FOCUS_RING}`}
        >
          {generated ? "Regenerate follow-ups" : "Generate follow-up emails"}
        </button>
      </form>

      {/* Output: show selected pattern's email */}
      {generated && displayedEmail && (
        <section aria-label="Generated follow-up email">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">
            {PATTERN_META[pattern].label}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              — edit directly, then copy
            </span>
          </h2>
          <EmailCard key={pattern} email={displayedEmail} />
          <p className="mt-4 text-xs text-zinc-600 leading-relaxed">
            Keep it short. Recruiters get a lot of email — three tight
            paragraphs beats a wall of text every time.
          </p>
        </section>
      )}
    </div>
  );
}

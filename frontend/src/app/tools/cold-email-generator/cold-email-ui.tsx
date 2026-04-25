"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  generateColdEmails,
  type ColdEmailInputs,
  type GeneratedEmail,
} from "@/lib/tools/cold-email-templates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_YOUR_NAME_KEY = "autoappli_cold_email_your_name";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

// ---------------------------------------------------------------------------
// Sub-components
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
// Copy button with transient "Copied!" state
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
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
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
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
          Copy
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Single email card (editable subject + body)
// ---------------------------------------------------------------------------

interface EmailCardProps {
  email: GeneratedEmail;
  index: number;
}

function EmailCard({ email, index }: EmailCardProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [expanded, setExpanded] = useState(index === 0);

  // Reset editable fields if underlying generated email changes (new generation)
  useEffect(() => {
    setSubject(email.subject);
    setBody(email.body);
    setExpanded(index === 0);
  }, [email.subject, email.body, index]);

  const fullText = `Subject: ${subject}\n\n${body}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {/* Card header */}
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

      {/* Editable fields */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-zinc-800">
          {/* Subject */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`subject-${email.id}`}
                className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
              >
                Subject line
              </label>
              <CopyButton text={subject} />
            </div>
            <input
              id={`subject-${email.id}`}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`body-${email.id}`}
                className="text-xs font-medium text-zinc-400 uppercase tracking-wide"
              >
                Email body
              </label>
              <CopyButton text={body} />
            </div>
            <textarea
              id={`body-${email.id}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Copy all */}
          <div className="flex justify-end">
            <CopyButton text={fullText} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export default function ColdEmailUI() {
  const [targetName, setTargetName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [yourName, setYourName] = useState("");
  const [whyReachingOut, setWhyReachingOut] = useState("");
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [generated, setGenerated] = useState(false);

  // Restore sender name from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_YOUR_NAME_KEY);
      if (saved) setYourName(saved);
    } catch {
      // localStorage unavailable — continue silently.
    }
  }, []);

  // Persist sender name whenever it changes
  useEffect(() => {
    if (!yourName) return;
    try {
      localStorage.setItem(LS_YOUR_NAME_KEY, yourName);
    } catch {
      // Silently ignore storage errors.
    }
  }, [yourName]);

  const allFilled =
    targetName.trim() &&
    targetCompany.trim() &&
    yourName.trim() &&
    whyReachingOut.trim();

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;
    const inputs: ColdEmailInputs = {
      targetName: targetName.trim(),
      targetCompany: targetCompany.trim(),
      yourName: yourName.trim(),
      whyReachingOut: whyReachingOut.trim(),
    };
    setEmails(generateColdEmails(inputs));
    setGenerated(true);
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Input form */}
      <form onSubmit={handleGenerate} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="target-name"
            label="Their name"
            placeholder="e.g. Sarah Chen"
            value={targetName}
            onChange={setTargetName}
            hint="First name or full name of the person you're emailing."
          />
          <TextInput
            id="target-company"
            label="Their company"
            placeholder="e.g. Stripe"
            value={targetCompany}
            onChange={setTargetCompany}
          />
        </div>

        <TextInput
          id="your-name"
          label="Your name"
          placeholder="e.g. Jordan Lee"
          value={yourName}
          onChange={setYourName}
          hint="Remembered in your browser for next time."
        />

        <div>
          <label
            htmlFor="why-reaching-out"
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            Why you're reaching out
          </label>
          <textarea
            id="why-reaching-out"
            value={whyReachingOut}
            onChange={(e) => setWhyReachingOut(e.target.value)}
            placeholder="e.g. I'm a junior CS student at Georgia Tech interested in backend engineering. I read Sarah's post on distributed tracing and it matched exactly what I've been building in my systems class. I'd love to learn how she thinks about observability at scale."
            rows={5}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y text-sm leading-relaxed"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Write naturally — one paragraph. The more specific, the better the output.
            Nothing leaves your browser.
          </p>
        </div>

        <button
          type="submit"
          disabled={!allFilled}
          className={`w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-blue-600/20 ${FOCUS_RING}`}
        >
          {generated ? "Regenerate templates" : "Generate 3 cold email templates"}
        </button>
      </form>

      {/* Output */}
      {generated && emails.length > 0 && (
        <section aria-label="Generated email templates">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">
            Your 3 templates
            <span className="ml-2 text-xs font-normal text-zinc-500">
              — edit directly, then copy
            </span>
          </h2>
          <div className="space-y-4">
            {emails.map((email, i) => (
              <EmailCard key={email.id} email={email} index={i} />
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-600 leading-relaxed">
            These are starting points, not finished emails. Personalise the opener
            with something specific — a project, a post, a shared contact.
          </p>
        </section>
      )}
    </div>
  );
}

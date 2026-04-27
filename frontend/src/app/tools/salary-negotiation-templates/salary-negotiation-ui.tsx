"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import {
  generateAllNegotiations,
  NEGOTIATION_PATTERN_META,
  type NegotiationPattern,
  type NegotiationInputs,
  type NegotiationEmail,
} from "@/lib/tools/salary-negotiation-templates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEY = "autoappli_salary_negotiation_v1";

const PATTERNS: NegotiationPattern[] = [
  "counter-offer",
  "multiple-offers",
  "ask-for-time",
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

// ---------------------------------------------------------------------------
// Persisted state shape
// ---------------------------------------------------------------------------

interface PersistedState {
  senderName: string;
  companyName: string;
  roleTitle: string;
}

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
  required?: boolean;
}

function TextInput({
  id, label, placeholder, value, onChange, hint, required,
}: TextInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1.5">
        {label}
        {!required && <span className="ml-1 text-zinc-500 font-normal">(optional)</span>}
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
// NumberInput sub-component
// ---------------------------------------------------------------------------

interface NumberInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
  prefix?: string;
}

function NumberInput({
  id, label, placeholder, value, onChange, hint, required, prefix = "$",
}: NumberInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1.5">
        {label}
        {!required && <span className="ml-1 text-zinc-500 font-normal">(optional)</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-7 pr-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>
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
          <span aria-live="polite">Copied</span>
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
  selected: NegotiationPattern;
  onChange: (p: NegotiationPattern) => void;
}

function PatternTabs({ selected, onChange }: PatternTabsProps) {
  return (
    <div role="tablist" aria-label="Negotiation pattern" className="flex flex-col sm:flex-row gap-2">
      {PATTERNS.map((p) => {
        const meta = NEGOTIATION_PATTERN_META[p];
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
            <span className="block text-xs mt-0.5 text-zinc-500">{meta.description}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single email output card
// ---------------------------------------------------------------------------

interface EmailCardProps {
  email: NegotiationEmail;
}

function EmailCard({ email }: EmailCardProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [expanded, setExpanded] = useState(true);

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
          <span className="text-sm font-semibold text-zinc-100">{email.patternLabel}</span>
          <p className="mt-0.5 text-xs text-zinc-500">{email.patternDescription}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-zinc-800">
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
              rows={12}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y font-mono leading-relaxed"
            />
          </div>

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

export default function SalaryNegotiationUI() {
  const [senderName, setSenderName] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [currentOffer, setCurrentOffer] = useState("");
  const [targetOffer, setTargetOffer] = useState("");
  const [competingOffer, setCompetingOffer] = useState("");
  const [competingCompanyAnon, setCompetingCompanyAnon] = useState(false);
  const [decisionDeadlineDays, setDecisionDeadlineDays] = useState("");
  const [pattern, setPattern] = useState<NegotiationPattern>("counter-offer");
  const [emails, setEmails] = useState<NegotiationEmail[]>([]);
  const [generated, setGenerated] = useState(false);

  // Restore persisted state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PersistedState>;
        if (parsed.senderName) setSenderName(parsed.senderName);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.roleTitle) setRoleTitle(parsed.roleTitle);
      }
    } catch {
      // localStorage unavailable or invalid JSON — continue silently.
    }
  }, []);

  // Persist sender name + last-used company/role on change
  useEffect(() => {
    try {
      const state: PersistedState = { senderName, companyName, roleTitle };
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // Silently ignore storage errors.
    }
  }, [senderName, companyName, roleTitle]);

  const currentNum = parseFloat(currentOffer);
  const targetNum = parseFloat(targetOffer);
  const currentValid = !isNaN(currentNum) && currentNum > 0;
  const targetValid = !isNaN(targetNum) && targetNum > 0;
  const targetWarn = currentValid && targetValid && targetNum <= currentNum;

  const requiredFilled =
    senderName.trim() &&
    recruiterName.trim() &&
    roleTitle.trim() &&
    companyName.trim() &&
    currentValid &&
    targetValid;

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredFilled) return;

    const inputs: NegotiationInputs = {
      senderName: senderName.trim(),
      recruiterName: recruiterName.trim(),
      roleTitle: roleTitle.trim(),
      companyName: companyName.trim(),
      currentOffer: currentNum,
      targetOffer: targetNum,
      competingOffer: competingOffer ? parseFloat(competingOffer) || undefined : undefined,
      competingCompanyAnon,
      decisionDeadlineDays: decisionDeadlineDays ? parseInt(decisionDeadlineDays, 10) || undefined : undefined,
    };
    setEmails(generateAllNegotiations(inputs));
    setGenerated(true);
  }

  const displayedEmail = emails.find((e) => e.pattern === pattern) ?? null;

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={handleGenerate} noValidate className="space-y-5">
        {/* Pattern selector */}
        <div>
          <p className="block text-sm font-medium text-zinc-300 mb-2">
            Negotiation type
          </p>
          <PatternTabs selected={pattern} onChange={setPattern} />
        </div>

        {/* Row: sender name + recruiter name */}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="sender-name"
            label="Your name"
            placeholder="e.g. Jordan Lee"
            value={senderName}
            onChange={setSenderName}
            hint="Remembered in your browser for next time."
            required
          />
          <TextInput
            id="recruiter-name"
            label="Recruiter's name"
            placeholder="e.g. Sarah Chen"
            value={recruiterName}
            onChange={setRecruiterName}
            required
          />
        </div>

        {/* Row: role title + company name */}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="role-title"
            label="Role title"
            placeholder="e.g. Software Engineering Intern"
            value={roleTitle}
            onChange={setRoleTitle}
            hint="Remembered in your browser for next time."
            required
          />
          <TextInput
            id="company-name"
            label="Company"
            placeholder="e.g. Stripe"
            value={companyName}
            onChange={setCompanyName}
            required
          />
        </div>

        {/* Row: current offer + target offer */}
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberInput
            id="current-offer"
            label="Current offer (USD)"
            placeholder="85000"
            value={currentOffer}
            onChange={setCurrentOffer}
            required
          />
          <div>
            <NumberInput
              id="target-offer"
              label="Target offer (USD)"
              placeholder="95000"
              value={targetOffer}
              onChange={setTargetOffer}
              required
            />
            {targetWarn && (
              <div
                role="alert"
                className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-400"
              >
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                <span>Target should be higher than the current offer for a counter-offer.</span>
              </div>
            )}
          </div>
        </div>

        {/* Competing offer — shown for all patterns but only used by multiple-offers */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <NumberInput
              id="competing-offer"
              label="Competing offer (USD)"
              placeholder="100000"
              value={competingOffer}
              onChange={setCompetingOffer}
              hint='Used by the "Multiple offers" template.'
            />
            <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={competingCompanyAnon}
                onChange={(e) => setCompetingCompanyAnon(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500/30"
              />
              <span className="text-xs text-zinc-400">Keep competing company anonymous</span>
            </label>
          </div>

          <NumberInput
            id="deadline-days"
            label="Days needed to decide"
            placeholder="7"
            value={decisionDeadlineDays}
            onChange={setDecisionDeadlineDays}
            hint='Used by the "Ask for time" template.'
            prefix=""
          />
        </div>

        <button
          type="submit"
          disabled={!requiredFilled}
          className={`w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-blue-600/20 ${FOCUS_RING}`}
        >
          {generated ? "Regenerate templates" : "Generate negotiation emails"}
        </button>
      </form>

      {/* Output */}
      {generated && displayedEmail && (
        <section aria-label="Generated negotiation email">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">
            {NEGOTIATION_PATTERN_META[pattern].label}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              — edit directly, then copy
            </span>
          </h2>
          <EmailCard key={pattern} email={displayedEmail} />
          <p className="mt-4 text-xs text-zinc-600 leading-relaxed">
            Keep the tone warm and collaborative. Recruiters present your
            counter to the hiring manager — make it easy for them to advocate
            for you.
          </p>
        </section>
      )}
    </div>
  );
}

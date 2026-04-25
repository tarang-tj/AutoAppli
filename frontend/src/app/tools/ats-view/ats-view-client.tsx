"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Mail,
  Phone,
  MapPin,
  User,
  Link as LinkIcon,
  GraduationCap,
  Briefcase,
  Wrench,
  FolderGit2,
  FileText,
} from "lucide-react";
import { parseAts, type AtsParsedResume } from "@/lib/tools/ats-parse";
import { detectAtsIssues, type AtsIssue, type IssueSeverity } from "@/lib/tools/ats-issues";

/**
 * Client island for the ATS view.
 *
 * Pattern matches subject-line-tester: useDeferredValue keeps typing
 * snappy by letting React batch the parse + issue-detect work behind
 * the textarea render. No debounce timer needed.
 */
export default function AtsViewClient() {
  const [input, setInput] = useState("");
  const deferred = useDeferredValue(input);
  const parsed = useMemo(() => parseAts(deferred), [deferred]);
  const issues = useMemo(() => detectAtsIssues(parsed, deferred), [parsed, deferred]);
  const showResults = input.trim().length > 0;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* INPUT */}
      <div>
        <label
          htmlFor="ats-input"
          className="block text-sm font-medium text-zinc-300 mb-2"
        >
          Paste your resume (plain text)
        </label>
        <textarea
          id="ats-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Copy from your PDF or Word doc and paste here. Plain text works best."
          rows={24}
          className="w-full min-h-[420px] rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono leading-relaxed"
          aria-describedby="ats-input-help"
        />
        <p id="ats-input-help" className="mt-2 text-xs text-zinc-500">
          Nothing is sent. Parsing runs in your browser.
        </p>

        {showResults && (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
            <span className="text-zinc-300">{parsed.characterCount.toLocaleString()}</span>{" "}
            characters · approx{" "}
            <span className="text-zinc-300">{parsed.estimatedPages}</span> pages
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div className="space-y-6">
        {showResults ? (
          <>
            <ParsedPanel parsed={parsed} />
            <IssuesPanel issues={issues} />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
            Paste a resume on the left to see what an ATS extracts and where it
            stumbles.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Parsed panel ----------------------------------------------------------

function ParsedPanel({ parsed }: { parsed: AtsParsedResume }) {
  const headingId = "ats-parsed-heading";
  return (
    <section
      role="region"
      aria-labelledby={headingId}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h2 id={headingId} className="text-base font-semibold text-zinc-100">
        What an ATS sees
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Each section is what a naive parser would extract. Blanks are gaps to
        fix.
      </p>

      <div className="mt-5 space-y-5">
        {/* Contact */}
        <div>
          <SectionHeader icon={<User className="h-4 w-4" aria-hidden="true" />}>
            Contact
          </SectionHeader>
          <dl className="mt-2 grid grid-cols-1 gap-1.5 text-sm">
            <ContactRow
              icon={<User className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Name"
              value={parsed.contact.name}
            />
            <ContactRow
              icon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Email"
              value={parsed.contact.email}
            />
            <ContactRow
              icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Phone"
              value={parsed.contact.phone}
            />
            <ContactRow
              icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Location"
              value={parsed.contact.location}
            />
          </dl>
          {parsed.contact.links.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {parsed.contact.links.map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-zinc-300">
                  <LinkIcon
                    className="h-3.5 w-3.5 text-zinc-500"
                    aria-hidden="true"
                  />
                  <span className="text-zinc-500 w-16 shrink-0 text-xs uppercase tracking-wide">
                    {l.label}
                  </span>
                  <span className="truncate text-zinc-300">{l.url}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary */}
        {parsed.summary && (
          <div>
            <SectionHeader
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            >
              Summary
            </SectionHeader>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              {parsed.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        <div>
          <SectionHeader
            icon={<Briefcase className="h-4 w-4" aria-hidden="true" />}
          >
            Experience ({parsed.experience.length})
          </SectionHeader>
          {parsed.experience.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 italic">
              No experience entries detected.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {parsed.experience.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="text-sm text-zinc-100">
                      {e.role || (
                        <span className="text-zinc-500 italic">
                          (role not parsed)
                        </span>
                      )}
                      {e.company && (
                        <span className="text-zinc-400"> · {e.company}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 tabular-nums">
                      {e.dates || "(no dates)"}
                    </div>
                  </div>
                  {e.bullets.length > 0 && (
                    <ul className="mt-2 space-y-1 list-disc pl-5 text-sm text-zinc-400">
                      {e.bullets.map((b, j) => (
                        <li key={j} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Skills */}
        <div>
          <SectionHeader
            icon={<Wrench className="h-4 w-4" aria-hidden="true" />}
          >
            Skills ({parsed.skills.length})
          </SectionHeader>
          {parsed.skills.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 italic">
              No skills section detected.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsed.skills.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-xs text-zinc-300"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Education */}
        <div>
          <SectionHeader
            icon={<GraduationCap className="h-4 w-4" aria-hidden="true" />}
          >
            Education ({parsed.education.length})
          </SectionHeader>
          {parsed.education.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 italic">
              No education detected.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {parsed.education.map((e, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm"
                >
                  <div className="text-zinc-100">
                    {e.school || (
                      <span className="text-zinc-500 italic">
                        (school not parsed)
                      </span>
                    )}
                  </div>
                  {e.degree && (
                    <div className="text-zinc-400 text-xs mt-0.5">{e.degree}</div>
                  )}
                  {e.dates && (
                    <div className="text-zinc-500 text-xs tabular-nums mt-0.5">
                      {e.dates}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Projects */}
        {parsed.projects.length > 0 && (
          <div>
            <SectionHeader
              icon={<FolderGit2 className="h-4 w-4" aria-hidden="true" />}
            >
              Projects ({parsed.projects.length})
            </SectionHeader>
            <ul className="mt-2 space-y-2">
              {parsed.projects.map((p, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm"
                >
                  <div className="text-zinc-100">{p.name}</div>
                  {p.description && (
                    <div className="text-zinc-400 text-xs mt-1 leading-relaxed">
                      {p.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// --- Issues panel ----------------------------------------------------------

function IssuesPanel({ issues }: { issues: AtsIssue[] }) {
  const headingId = "ats-issues-heading";
  return (
    <section
      role="region"
      aria-labelledby={headingId}
      aria-live="polite"
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h2 id={headingId} className="text-base font-semibold text-zinc-100">
        Issues found ({issues.length})
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Ranked by how badly each one hurts your odds.
      </p>

      {issues.length === 0 ? (
        <p className="mt-4 text-sm text-emerald-300">
          No issues flagged. Your structure parses cleanly.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {issues.map((i, idx) => (
            <IssueRow key={idx} issue={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

const SEVERITY_STYLES: Record<
  IssueSeverity,
  { wrapper: string; badge: string; label: string; Icon: typeof AlertCircle }
> = {
  critical: {
    wrapper: "border-red-500/40 bg-red-500/5",
    badge: "bg-red-500/15 border-red-500/40 text-red-300",
    label: "Critical",
    Icon: AlertCircle,
  },
  high: {
    wrapper: "border-amber-500/40 bg-amber-500/5",
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    label: "High",
    Icon: AlertTriangle,
  },
  medium: {
    wrapper: "border-yellow-500/30 bg-yellow-500/5",
    badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    label: "Medium",
    Icon: AlertTriangle,
  },
  low: {
    wrapper: "border-zinc-700 bg-zinc-900/40",
    badge: "bg-zinc-800 border-zinc-700 text-zinc-300",
    label: "Low",
    Icon: Info,
  },
};

function IssueRow({ issue }: { issue: AtsIssue }) {
  const style = SEVERITY_STYLES[issue.severity];
  const Icon = style.Icon;
  return (
    <li
      className={`rounded-lg border p-3 ${style.wrapper}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className="h-4 w-4 mt-0.5 flex-shrink-0 text-zinc-300"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.badge}`}
            >
              {style.label}
            </span>
            <span className="text-sm text-zinc-100 leading-snug">
              {issue.message}
            </span>
          </div>
          {issue.detail && (
            <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
              {issue.detail}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// --- Helpers ---------------------------------------------------------------

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
      <span className="text-zinc-400">{icon}</span>
      {children}
    </h3>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500" aria-hidden="true">
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className={value ? "text-zinc-200" : "text-zinc-600 italic"}>
        {value ?? "(not detected)"}
      </dd>
    </div>
  );
}

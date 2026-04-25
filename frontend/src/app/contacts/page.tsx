"use client";

import { useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { CRMContact, Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase,
} from "lucide-react";
import useSWR from "swr";

// ── Relationship config ──────────────────────────────────────────

const REL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  recruiter: { label: "Recruiter", color: "text-blue-400", bg: "bg-blue-400/10" },
  hiring_manager: { label: "Hiring Manager", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  referral: { label: "Referral", color: "text-purple-400", bg: "bg-purple-400/10" },
  peer: { label: "Peer", color: "text-amber-400", bg: "bg-amber-400/10" },
  other: { label: "Other", color: "text-zinc-400", bg: "bg-zinc-400/10" },
};

function RelBadge({ rel }: { rel: string }) {
  const cfg = REL_CONFIG[rel] || REL_CONFIG.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── New contact form ─────────────────────────────────────────────

function NewContactForm({ jobs, onCreated }: { jobs: Job[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [relationship, setRelationship] = useState("recruiter");
  const [jobId, setJobId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await apiPost("/contacts", {
        name,
        role,
        company,
        email,
        linkedin_url: linkedin,
        relationship,
        job_id: jobId || null,
        notes,
      });
      setName(""); setRole(""); setCompany(""); setEmail("");
      setLinkedin(""); setRelationship("recruiter"); setJobId(""); setNotes("");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-expanded="false"
        aria-controls="new-contact-form"
      >
        <Plus className="h-4 w-4" aria-hidden="true" /> Add Contact
      </Button>
    );
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="new-contact-form"
          onSubmit={handleSubmit}
          className="space-y-3"
          aria-busy={submitting}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-name" className="text-xs text-zinc-400 block mb-1">Name *</label>
              <Input
                id="contact-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Kim"
                className="bg-zinc-800 border-zinc-700"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-role" className="text-xs text-zinc-400 block mb-1">Role</label>
              <Input
                id="contact-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Technical Recruiter"
                className="bg-zinc-800 border-zinc-700"
                autoComplete="organization-title"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-company" className="text-xs text-zinc-400 block mb-1">Company</label>
              <Input
                id="contact-company"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc"
                className="bg-zinc-800 border-zinc-700"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor="contact-relationship" className="text-xs text-zinc-400 block mb-1">Relationship</label>
              <select
                id="contact-relationship"
                name="relationship"
                className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="recruiter">Recruiter</option>
                <option value="hiring_manager">Hiring Manager</option>
                <option value="referral">Referral</option>
                <option value="peer">Peer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact-email" className="text-xs text-zinc-400 block mb-1">Email</label>
              <Input
                id="contact-email"
                name="email"
                type="email"
                inputMode="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="bg-zinc-800 border-zinc-700"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="contact-linkedin" className="text-xs text-zinc-400 block mb-1">LinkedIn URL</label>
              <Input
                id="contact-linkedin"
                name="linkedin_url"
                type="url"
                inputMode="url"
                spellCheck={false}
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="bg-zinc-800 border-zinc-700"
                autoComplete="url"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-job" className="text-xs text-zinc-400 block mb-1">Related Job</label>
            <select
              id="contact-job"
              name="job_id"
              className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">None</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} — {j.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="contact-notes" className="text-xs text-zinc-400 block mb-1">Notes</label>
            <Textarea
              id="contact-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How you met, context…"
              className="bg-zinc-800 border-zinc-700"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim()} size="sm">{submitting ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Contact card ─────────────────────────────────────────────────

function ContactCard({ contact, job, onRefresh }: { contact: CRMContact; job?: Job; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const interactionsId = `contact-interactions-${contact.id}`;

  const lastContact = contact.last_contacted_at
    ? new Date(contact.last_contacted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/contacts/${contact.id}`);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-zinc-700 bg-zinc-900 transition-colors hover:border-zinc-600">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-zinc-100 text-sm">{contact.name}</h3>
              <RelBadge rel={contact.relationship} />
            </div>
            {(contact.role || contact.company) && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {contact.role}{contact.role && contact.company ? " at " : ""}{contact.company}
              </p>
            )}
            {job && (
              <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" aria-hidden="true" /> {job.title} — {job.company}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 flex-wrap">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                >
                  <Mail className="h-3 w-3" aria-hidden="true" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" aria-hidden="true" /> {contact.phone}</span>
              )}
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                  aria-label={`Open ${contact.name} on LinkedIn (new tab)`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" /> LinkedIn
                </a>
              )}
              {lastContact && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" /> Last contact: {lastContact}</span>
              )}
            </div>

            {contact.notes && <p className="text-xs text-zinc-400 mt-2">{contact.notes}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            aria-busy={deleting}
            aria-label={`Delete contact ${contact.name}`}
            className="h-7 px-2 text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>

        {contact.interactions && contact.interactions.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={interactionsId}
              className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {expanded ? "Hide" : "Show"} Interactions ({contact.interactions.length})
              {expanded
                ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
                : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
            </button>
            {expanded && (
              <div id={interactionsId} className="mt-2 space-y-2 pl-4 border-l border-zinc-700">
                {contact.interactions.map((ix) => (
                  <div key={ix.id} className="text-xs">
                    <span className="text-zinc-500">
                      {new Date(ix.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="mx-1 text-zinc-600" aria-hidden="true">·</span>
                    <span className="text-zinc-400 capitalize">{ix.interaction_type}</span>
                    {ix.summary && <p className="text-zinc-300 mt-0.5">{ix.summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────

export default function ContactsPage() {
  const { data: contacts, mutate: refreshContacts } = useSWR<CRMContact[]>(
    "/contacts",
    () => apiGet<CRMContact[]>("/contacts")
  );
  const { data: jobs } = useSWR<Job[]>("/jobs", () => apiGet<Job[]>("/jobs"));

  const jobMap = new Map((jobs || []).map((j) => [j.id, j]));

  // Group by relationship
  const byRel = new Map<string, CRMContact[]>();
  for (const c of contacts || []) {
    const rel = c.relationship || "other";
    if (!byRel.has(rel)) byRel.set(rel, []);
    byRel.get(rel)!.push(c);
  }

  const relOrder = ["recruiter", "hiring_manager", "referral", "peer", "other"];

  return (
    <div className="mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contacts</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track recruiters, hiring managers, and networking connections
          </p>
        </div>
        <NewContactForm jobs={jobs || []} onCreated={refreshContacts} />
      </div>

      {(contacts || []).length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          No contacts yet. Add recruiters and hiring managers to keep track of your network.
        </p>
      ) : (
        relOrder.filter((r) => byRel.has(r)).map((rel) => (
          <section key={rel} aria-labelledby={`contacts-section-${rel}`}>
            <h2 id={`contacts-section-${rel}`} className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" /> {REL_CONFIG[rel]?.label || rel} ({byRel.get(rel)!.length})
            </h2>
            <div className="space-y-3">
              {byRel.get(rel)!.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  job={jobMap.get(contact.job_id || "")}
                  onRefresh={refreshContacts}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

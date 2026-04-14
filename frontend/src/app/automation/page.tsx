"use client";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AutomationRule, AutomationSuggestion, Job } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Plus,
  Trash2,
  Play,
  AlertTriangle,
  Clock,
  CheckCircle,
  Radio,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { useState } from "react";

// ── Trigger/Action Config ────────────────────────────────────────

const TRIGGER_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  application_sent: { icon: CheckCircle, color: "#8b5cf6", label: "App Sent" },
  interview_scheduled: { icon: Calendar, color: "#f59e0b", label: "Interview" },
  no_response_days: { icon: Clock, color: "#ef4444", label: "No Response" },
  offer_received: { icon: Zap, color: "#10b981", label: "Offer" },
  manual: { icon: Radio, color: "#6b7280", label: "Manual" },
};

const ACTION_CONFIG: Record<string, { label: string }> = {
  move_to_status: { label: "Move to status" },
  add_reminder: { label: "Add reminder" },
  add_tag: { label: "Add tag" },
};

function Calendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// ── Rule Card ────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutomationRule;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const triggerInfo = TRIGGER_CONFIG[rule.trigger] || TRIGGER_CONFIG.manual;
  const TriggerIcon = triggerInfo.icon;
  const actionInfo = ACTION_CONFIG[rule.action] || { label: "Unknown" };
  const config = rule.action_config as Record<string, string | number>;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-2">{rule.name}</h3>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${triggerInfo.color}20` }}
              >
                <TriggerIcon className="h-4 w-4" style={{ color: triggerInfo.color }} />
              </div>
              <div className="text-sm text-zinc-400">
                <span className="font-medium text-white">{triggerInfo.label}</span>
                <span className="mx-2 text-zinc-600">→</span>
                <span>{actionInfo.label}</span>
              </div>
            </div>
            <div className="text-xs text-zinc-500 space-y-1">
              {rule.trigger === "no_response_days" && (
                <div>
                  After {config.days} days → Move to{" "}
                  <span className="text-zinc-300 font-medium">{config.target_status}</span>
                </div>
              )}
              {rule.trigger !== "no_response_days" && config.target_status && (
                <div>
                  Move to <span className="text-zinc-300 font-medium">{config.target_status}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => onToggle(rule.id, !rule.is_active)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                rule.is_active
                  ? "bg-blue-600/20 text-blue-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}
              title={rule.is_active ? "Disable" : "Enable"}
            >
              <Zap className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              title="Delete rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── New Rule Form ────────────────────────────────────────────────

function NewRuleForm({
  onCreateRule,
}: {
  onCreateRule: (rule: Partial<AutomationRule>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<string>("no_response_days");
  const [action, setAction] = useState<string>("move_to_status");
  const [days, setDays] = useState(14);
  const [targetStatus, setTargetStatus] = useState("ghosted");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateRule({
        name: name || "New Rule",
        trigger: trigger as any,
        action: action as any,
        action_config:
          trigger === "no_response_days"
            ? { days, target_status: targetStatus }
            : { target_status: targetStatus },
        is_active: true,
      });
      setName("");
      setTrigger("no_response_days");
      setTargetStatus("ghosted");
      setDays(14);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          New Rule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Custom ghosting rule"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Trigger
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TRIGGER_CONFIG).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ACTION_CONFIG).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {trigger === "no_response_days" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Days Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ghosted">Ghosted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Suggestion Card ──────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  jobs,
  onApply,
}: {
  suggestion: AutomationSuggestion;
  jobs: Job[];
  onApply: (suggestion: AutomationSuggestion) => Promise<void>;
}) {
  const job = jobs.find((j) => j.id === suggestion.job_id);
  const [applying, setApplying] = useState(false);

  if (!job) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(suggestion);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white">
              {job.company} — {job.title}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{suggestion.suggested_action}</p>
            <p className="text-xs text-zinc-500 mt-2">{suggestion.reason}</p>
          </div>
          <Button
            onClick={handleApply}
            disabled={applying}
            size="sm"
            className="flex-shrink-0 ml-4 bg-green-600 hover:bg-green-700 text-white"
          >
            {applying ? "Applying..." : "Apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stale Jobs Section ───────────────────────────────────────────

function StaleJobsSection({
  staleJobs,
  onMarkAsGhosted,
}: {
  staleJobs: Job[];
  onMarkAsGhosted: (jobIds: string[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);

  if (staleJobs.length === 0) {
    return null;
  }

  const handleMarkAsGhosted = async () => {
    setApplying(true);
    try {
      await onMarkAsGhosted(staleJobs.map((j) => j.id));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Stale Jobs ({staleJobs.length})
      </h2>
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left font-medium text-blue-400 hover:text-blue-300 text-sm mb-4"
          >
            {expanded ? "Hide" : "Show"} {staleJobs.length} stale job
            {staleJobs.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {staleJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-2 bg-zinc-800/50 rounded text-sm text-zinc-300"
                >
                  <div className="font-medium text-white">
                    {job.company} — {job.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Last updated:{" "}
                    {new Date(job.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={handleMarkAsGhosted}
            disabled={applying}
            size="sm"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            {applying ? "Marking..." : "Mark All as Ghosted"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function AutomationPage() {
  const { data: rules, isLoading: rulesLoading, mutate: mutateRules } = useSWR(
    "/automation/rules",
    apiGet<AutomationRule[]>
  );

  const { data: jobsResp } = useSWR("/jobs", apiGet<Job[]>);
  const jobs = jobsResp || [];

  const { data: suggestionsResp, mutate: mutateSuggestions } = useSWR(
    "/automation/evaluate",
    apiGet<{ suggestions: AutomationSuggestion[] }>
  );
  const suggestions = suggestionsResp?.suggestions || [];

  const { data: staleResp } = useSWR(
    "/automation/stale?days=14",
    apiGet<{ stale_jobs: Job[]; days: number }>
  );
  const staleJobs = staleResp?.stale_jobs || [];

  const handleCreateRule = async (rule: Partial<AutomationRule>) => {
    await apiPost("/automation/rules", rule);
    await mutateRules();
    await mutateSuggestions();
  };

  const handleToggleRule = async (ruleId: string, active: boolean) => {
    await apiPatch(`/automation/rules/${ruleId}`, { is_active: active });
    await mutateRules();
    await mutateSuggestions();
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm("Delete this rule?")) {
      await apiDelete(`/automation/rules/${ruleId}`);
      await mutateRules();
      await mutateSuggestions();
    }
  };

  const handleApplySuggestion = async (suggestion: AutomationSuggestion) => {
    const { suggested_action } = suggestion;
    if (suggested_action.includes("ghosted")) {
      await apiPatch(`/jobs/${suggestion.job_id}`, { status: "ghosted" });
    } else if (suggested_action.includes("interviewing")) {
      await apiPatch(`/jobs/${suggestion.job_id}`, { status: "interviewing" });
    } else if (suggested_action.includes("applied")) {
      await apiPatch(`/jobs/${suggestion.job_id}`, { status: "applied" });
    }
    await mutate("/jobs");
    await mutateSuggestions();
  };

  const handleMarkAsGhosted = async (jobIds: string[]) => {
    for (const jobId of jobIds) {
      await apiPatch(`/jobs/${jobId}`, { status: "ghosted" });
    }
    await mutate("/jobs");
    await mutateSuggestions();
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-blue-500" />
            Kanban Automation
          </h1>
          <p className="text-zinc-400">
            Create rules to automatically manage your job applications
          </p>
        </div>

        {/* Active Rules Section */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Active Rules</h2>
          <div className="space-y-3 mb-6">
            {rulesLoading ? (
              <div className="text-zinc-400">Loading rules...</div>
            ) : (rules || []).length > 0 ? (
              (rules || []).map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggleRule}
                  onDelete={handleDeleteRule}
                />
              ))
            ) : (
              <div className="text-zinc-400">No rules created yet</div>
            )}
          </div>

          <NewRuleForm onCreateRule={handleCreateRule} />
        </div>

        {/* Evaluate & Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Play className="h-5 w-5" />
              Suggested Actions
            </h2>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <SuggestionCard
                  key={idx}
                  suggestion={suggestion}
                  jobs={jobs}
                  onApply={handleApplySuggestion}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center text-zinc-400">
                No suggestions at this time. Rules will suggest actions when conditions are met.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stale Jobs */}
        {staleJobs.length > 0 && (
          <StaleJobsSection
            staleJobs={staleJobs}
            onMarkAsGhosted={handleMarkAsGhosted}
          />
        )}
      </div>
    </div>
  );
}

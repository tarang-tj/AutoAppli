"use client";
import { OutreachForm } from "@/components/outreach/outreach-form";
import { MessagePreview } from "@/components/outreach/message-preview";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, isJobsApiConfigured } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoOutreachMessages } from "@/lib/demo-data";
import {
  consumeOutreachHandoff,
  outreachHandoffFromJob,
  type TrackerOutreachHandoff,
} from "@/lib/tracker-handoff";
import type { Job, OutreachMessage, OutreachMessagePurpose, UserProfile } from "@/types";
import { startTransition, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Heart, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

function messagePurpose(m: OutreachMessage): OutreachMessagePurpose {
  return m.message_purpose ?? "outreach";
}

function OutreachPageContent() {
  const searchParams = useSearchParams();
  const [demoMode] = useState(!isSupabaseConfigured());
  const [historyFilter, setHistoryFilter] = useState<"all" | OutreachMessagePurpose>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: history, mutate: mutateHistory } = useSWR<OutreachMessage[]>(
    "/outreach",
    () => {
      if (demoMode) {
        return getDemoOutreachMessages();
      }
      return apiGet<OutreachMessage[]>("/outreach");
    },
    { revalidateOnFocus: false }
  );

  const { data: profile } = useSWR<UserProfile>("/profile", () => apiGet<UserProfile>("/profile"), {
    revalidateOnFocus: false,
  });

  const [currentMessage, setCurrentMessage] = useState<OutreachMessage | null>(null);
  const [trackerPrefill, setTrackerPrefill] = useState<TrackerOutreachHandoff | null>(null);

  useEffect(() => {
    const jobId = searchParams.get("jobId");
    const qCompany = searchParams.get("company");
    const qTitle = searchParams.get("title");
    const qPurpose = searchParams.get("purpose");

    const applySessionHandoff = () => {
      const h = consumeOutreachHandoff();
      if (!h) return;
      const label = [h.jobTitle, h.company].filter(Boolean).join(" · ");
      startTransition(() => {
        setTrackerPrefill(h);
        toast.success(label ? `Loaded from tracker: ${label}` : "Loaded job context from tracker");
      });
    };

    // Direct query-param prefill from job detail AI action links
    if ((qCompany || qTitle) && !jobId) {
      const h: TrackerOutreachHandoff = {
        v: 1,
        jobTitle: qTitle ?? "",
        company: qCompany ?? "",
        jobContext: [qTitle, qCompany].filter(Boolean).join(" — "),
      };
      startTransition(() => {
        setTrackerPrefill(h);
        if (qPurpose === "thank_you") {
          setHistoryFilter("thank_you");
        }
        const label = [qTitle, qCompany].filter(Boolean).join(" at ");
        toast.success(label ? `Pre-filled: ${label}` : "Loaded job context");
      });
      return;
    }

    if (jobId && isJobsApiConfigured()) {
      let cancelled = false;
      void apiGet<Job>(`/jobs/${encodeURIComponent(jobId)}`)
        .then((job) => {
          if (cancelled) return;
          const h = outreachHandoffFromJob(job);
          const label = [h.jobTitle, h.company].filter(Boolean).join(" · ");
          startTransition(() => {
            setTrackerPrefill(h);
            if (qPurpose === "thank_you") {
              setHistoryFilter("thank_you");
            }
            toast.success(label ? `Loaded from tracker: ${label}` : "Loaded role from tracker");
          });
        })
        .catch(() => {
          if (cancelled) return;
          applySessionHandoff();
        });
      return () => {
        cancelled = true;
      };
    }

    applySessionHandoff();
  }, [searchParams]);

  const clearTrackerPrefill = useCallback(() => {
    setTrackerPrefill(null);
  }, []);

  const filteredHistory = useMemo(() => {
    if (!history?.length) return [];
    if (historyFilter === "all") return history;
    return history.filter((m) => messagePurpose(m) === historyFilter);
  }, [history, historyFilter]);

  const onGeneratedMessage = useCallback(
    (msg: OutreachMessage) => {
      setCurrentMessage(msg);
      void mutateHistory();
    },
    [mutateHistory]
  );

  const deleteMessage = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeletingId(id);
      try {
        await apiDelete(`/outreach/${encodeURIComponent(id)}`);
        await mutateHistory();
        setCurrentMessage((cur) => (cur?.id === id ? null : cur));
        toast.success("Message removed from history");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete message");
      } finally {
        setDeletingId(null);
      }
    },
    [mutateHistory]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Send className="h-7 w-7 text-blue-400" aria-hidden />
          Outreach
        </h1>
        <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
          Generate personalized emails and LinkedIn messages to recruiters and hiring managers.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutreachForm
          onGenerated={onGeneratedMessage}
          trackerPrefill={trackerPrefill}
          onTrackerPrefillConsumed={clearTrackerPrefill}
          applicantName={profile?.display_name}
        />
        <div className="space-y-6">
          <MessagePreview message={currentMessage} />
          {history && history.length > 0 && (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-400">Saved drafts</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["all", "All"],
                      ["outreach", "Outreach"],
                      ["thank_you", "Thank-you"],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      type="button"
                      variant={historyFilter === key ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 text-xs",
                        historyFilter === key && "bg-zinc-800 text-white hover:bg-zinc-700"
                      )}
                      onClick={() => setHistoryFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="max-h-[min(24rem,50vh)] overflow-y-auto space-y-2 pr-1">
                {filteredHistory.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center">No messages in this filter.</p>
                ) : (
                  filteredHistory.map((msg) => {
                    const ty = messagePurpose(msg);
                    return (
                      <div
                        key={msg.id}
                        className="group flex gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => setCurrentMessage(msg)}
                          className="min-w-0 flex-1 text-left p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-white truncate">{msg.recipient_name}</span>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {ty === "thank_you" && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-medium text-rose-200">
                                  <Heart className="h-3 w-3" aria-hidden />
                                  Thanks
                                </span>
                              )}
                              <span className="text-xs text-zinc-500 capitalize">{msg.message_type}</span>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 truncate">
                            {msg.subject || msg.body.slice(0, 100)}
                          </p>
                        </button>
                        <div className="flex items-center pr-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-zinc-500 hover:text-red-400 opacity-70 group-hover:opacity-100"
                            disabled={deletingId === msg.id}
                            aria-label="Delete draft"
                            onClick={(e) => void deleteMessage(e, msg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 animate-pulse" role="status" aria-label="Loading outreach">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-4 w-72 bg-zinc-800/60 rounded" />
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="h-56 bg-zinc-800/60 rounded-xl" />
            <div className="h-56 bg-zinc-800/60 rounded-xl" />
          </div>
        </div>
      }
    >
      <OutreachPageContent />
    </Suspense>
  );
}

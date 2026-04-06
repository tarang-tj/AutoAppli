"use client";
import { OutreachForm } from "@/components/outreach/outreach-form";
import { MessagePreview } from "@/components/outreach/message-preview";
import { apiGet } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoOutreachMessages } from "@/lib/demo-data";
import type { OutreachMessage } from "@/types";
import { useState } from "react";
import useSWR from "swr";

export default function OutreachPage() {
  const [demoMode] = useState(!isSupabaseConfigured());

  const { data: history } = useSWR<OutreachMessage[]>(
    "/outreach",
    () => {
      if (demoMode) {
        return getDemoOutreachMessages();
      }
      return apiGet<OutreachMessage[]>("/outreach");
    },
    { revalidateOnFocus: false }
  );

  const [currentMessage, setCurrentMessage] = useState<OutreachMessage | null>(null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Outreach</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Generate personalized emails and LinkedIn messages to recruiters and hiring managers
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutreachForm onGenerated={setCurrentMessage} />
        <div className="space-y-6">
          <MessagePreview message={currentMessage} />
          {history && history.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Messages</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setCurrentMessage(msg)}
                    className="w-full text-left p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{msg.recipient_name}</span>
                      <span className="text-xs text-zinc-500 capitalize">{msg.message_type}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 truncate">
                      {msg.subject || msg.body.slice(0, 80)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

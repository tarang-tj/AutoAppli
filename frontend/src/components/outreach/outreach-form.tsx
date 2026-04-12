"use client";
import type { TrackerOutreachHandoff } from "@/lib/tracker-handoff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import type { OutreachMessage } from "@/types";
import { Send, Mail, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OutreachForm({
  onGenerated,
  trackerPrefill,
  onTrackerPrefillConsumed,
  applicantName,
}: {
  onGenerated: (msg: OutreachMessage) => void;
  trackerPrefill?: TrackerOutreachHandoff | null;
  onTrackerPrefillConsumed?: () => void;
  /** From Settings → profile; improves sign-off in AI drafts. */
  applicantName?: string;
}) {
  const [messageType, setMessageType] = useState<"email" | "linkedin">("email");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (!trackerPrefill) {
      prefillAppliedRef.current = false;
      return;
    }
    if (prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    setJobTitle(trackerPrefill.jobTitle);
    setCompany(trackerPrefill.company);
    setJobDescription(trackerPrefill.jobContext);
    onTrackerPrefillConsumed?.();
  }, [trackerPrefill, onTrackerPrefillConsumed]);

  const handleGenerate = async () => {
    if (!recipientName.trim()) { toast.error("Please enter a recipient name"); return; }
    setGenerating(true);
    try {
      const result = await apiPost<OutreachMessage>("/outreach/generate", {
        message_type: messageType,
        recipient_name: recipientName,
        recipient_role: recipientRole || undefined,
        job_title: jobTitle || undefined,
        company: company || undefined,
        job_description: jobDescription || undefined,
        applicant_name: applicantName?.trim() || undefined,
      });
      onGenerated(result);
      toast.success("Message generated!");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to generate message"); }
    finally { setGenerating(false); }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader><CardTitle className="text-white text-lg">Generate Outreach Message</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-zinc-300 text-sm mb-2 block">Message Type</Label>
          <div className="flex gap-2">
            <button onClick={() => setMessageType("email")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1", messageType === "email" ? "bg-blue-600/10 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700")}><Mail className="h-4 w-4" />Email</button>
            <button onClick={() => setMessageType("linkedin")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1", messageType === "linkedin" ? "bg-blue-600/10 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700")}><MessageCircle className="h-4 w-4" />LinkedIn</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label className="text-zinc-300">Recipient Name *</Label><Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Jane Smith" className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div className="space-y-2"><Label className="text-zinc-300">Their Role</Label><Input value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)} placeholder="Engineering Manager" className="bg-zinc-800 border-zinc-700 text-white" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label className="text-zinc-300">Job Title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer" className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div className="space-y-2"><Label className="text-zinc-300">Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" className="bg-zinc-800 border-zinc-700 text-white" /></div>
        </div>
        <div className="space-y-2"><Label className="text-zinc-300">Job Context</Label><Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste relevant job description or context..." rows={4} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></div>
        <Button onClick={handleGenerate} disabled={generating || !recipientName.trim()} className="w-full bg-blue-600 hover:bg-blue-700">{generating ? "Generating..." : <><Send className="h-4 w-4 mr-2" />Generate Message</>}</Button>
      </CardContent>
    </Card>
  );
}

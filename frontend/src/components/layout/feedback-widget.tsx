"use client";

/**
 * Pre-Sprint-9 instrumentation — sidebar feedback widget.
 *
 * One-click "Send feedback" button in the sidebar footer. Opens a small
 * Dialog with a category Select (bug / idea / confused / other) and a
 * textarea. Submits to public.feedback via the Supabase-direct helper —
 * no backend required.
 *
 * Why this is small surface-area on purpose:
 *   - During testing, the cost of clicking is the entire UX. Even one
 *     extra step (e.g. "name?", "email?") meaningfully drops submission
 *     rate. We already know who (auth.uid via RLS) and where (route auto-
 *     captured server-side).
 *   - Categories are intentionally fuzzy. "Confused" is the most useful
 *     signal during user testing — it surfaces UX issues that bug reports
 *     miss.
 */
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  submitFeedback,
  type FeedbackCategory,
} from "@/lib/supabase/feedback";
import { toast } from "sonner";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // No-op when Supabase isn't configured (true demo mode without env vars).
  // Hiding the button is friendlier than showing one that always errors.
  if (!isSupabaseConfigured()) return null;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      toast.error("Add a few more words so we know what you mean.");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ category, message: trimmed });
      toast.success("Thanks — we read every one of these.");
      setMessage("");
      setCategory("idea");
      setOpen(false);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't send feedback — try again?",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="w-full flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 [transition:color_150ms] py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        Send feedback
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Anything off, confusing, or missing? Let us know — we&apos;ll read it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="feedback-category" className="text-zinc-300">
              Type
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FeedbackCategory)}
              name="feedback-category"
            >
              <SelectTrigger
                id="feedback-category"
                className="bg-zinc-800 border-zinc-700 text-white w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="bug" className="text-white">
                  🐛 Bug — something&apos;s broken
                </SelectItem>
                <SelectItem value="confused" className="text-white">
                  🤔 Confused — I don&apos;t know what to do
                </SelectItem>
                <SelectItem value="idea" className="text-white">
                  💡 Idea — wish this existed
                </SelectItem>
                <SelectItem value="other" className="text-white">
                  💬 Other
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message" className="text-zinc-300">
              Message
            </Label>
            <Textarea
              id="feedback-message"
              name="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, what did you expect, what should we do differently?"
              rows={5}
              maxLength={2000}
              autoComplete="off"
              spellCheck
              aria-describedby="feedback-message-hint"
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
            />
            <p id="feedback-message-hint" className="text-xs text-zinc-500">
              We see your current page automatically — no need to mention it.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            aria-busy={submitting}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {submitting ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

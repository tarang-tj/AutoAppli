"use client";

/**
 * Edit-target dialog for the GoalTracker widget. Adopts the arcade
 * aesthetic from the parent (phosphor green, mono labels) so the modal
 * doesn't break the spell. Emits the new target via `onSave` — parent
 * owns persistence via `setGoalConfig`.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LABEL_GLOW } from "./arcade-styles";

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftTarget: string;
  onDraftChange: (next: string) => void;
  onTriggerClick: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function EditGoalDialog({
  open,
  onOpenChange,
  draftTarget,
  onDraftChange,
  onTriggerClick,
  onSubmit,
}: EditGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] uppercase tracking-[0.25em] text-emerald-300/70 hover:bg-emerald-500/10 hover:text-emerald-200 font-[family-name:var(--font-arcade-label)]"
            onClick={onTriggerClick}
            data-testid="goal-tracker-edit"
          />
        }
      >
        [ Edit goal ]
      </DialogTrigger>
      <DialogContent className="border-emerald-500/30 bg-zinc-950">
        <DialogHeader>
          <DialogTitle
            className="text-sm uppercase tracking-[0.25em] font-[family-name:var(--font-arcade-label)]"
            style={LABEL_GLOW}
          >
            &gt; Edit Weekly Target
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="goal-target"
              className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80 font-[family-name:var(--font-arcade-label)]"
            >
              Weekly application target
            </Label>
            <Input
              id="goal-target"
              type="number"
              min={1}
              max={100}
              value={draftTarget}
              onChange={(e) => onDraftChange(e.target.value)}
              className="border-emerald-500/40 bg-zinc-900 text-2xl tabular-nums text-emerald-200 font-[family-name:var(--font-arcade-digits)]"
              aria-describedby="goal-target-hint"
            />
            <p
              id="goal-target-hint"
              className="text-[11px] text-emerald-300/50 font-[family-name:var(--font-arcade-label)] tracking-wide"
            >
              How many applications do you want to send per week?
            </p>
          </div>
          <Button
            type="submit"
            className="w-full border border-emerald-400/40 bg-emerald-500/15 text-sm uppercase tracking-[0.3em] text-emerald-200 hover:bg-emerald-500/25 hover:text-emerald-100 font-[family-name:var(--font-arcade-label)]"
          >
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

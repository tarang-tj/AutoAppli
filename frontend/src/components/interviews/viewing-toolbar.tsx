"use client";

import { Copy, Link2, Sparkles } from "lucide-react";

/**
 * ViewingToolbar — action row shown above the transcript in the
 * "viewing" phase of /interviews/practice. Lets the user:
 *
 *   - Practice again with the same job context (pre-fills setup,
 *     doesn't auto-start — the user confirms with "Start practice").
 *   - Copy the full transcript to the clipboard as plain text.
 *   - Share a link that drops another user (or a future visit) back
 *     into this same session via ?sessionId=.
 *
 * Stateless; all handlers are owned by the practice page so the
 * toolbar never touches persistence directly.
 */

type Props = {
  onReplay: () => void;
  onCopy: () => void;
  onShare: () => void;
};

export function ViewingToolbar({ onReplay, onCopy, onShare }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-1.5">
      <ToolbarButton
        icon={Sparkles}
        label="Practice again"
        hint="Pre-fills setup with this role so you can start a fresh session"
        onClick={onReplay}
        variant="primary"
      />
      <ToolbarButton
        icon={Copy}
        label="Copy transcript"
        hint="Copy the full conversation to your clipboard"
        onClick={onCopy}
      />
      <ToolbarButton
        icon={Link2}
        label="Share link"
        hint="Copy a link that opens this session"
        onClick={onShare}
      />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  hint,
  onClick,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  onClick: () => void;
  variant?: "primary";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors";
  const theme =
    variant === "primary"
      ? "border border-violet-500/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
      : "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${theme}`}
      title={hint}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * ShortcutsHelp — global "?" overlay listing keyboard shortcuts.
 *
 * Two open triggers:
 *  1. Pressing `?` (Shift+/) while no text input is focused.
 *  2. Receiving the custom event `autoappli:open-shortcuts`, dispatched
 *     by the command palette so it can "Show keyboard shortcuts" without
 *     a direct import dependency.
 *
 * Closing: Escape or click the backdrop / close button.
 */

type Row = { keys: string[]; label: string };

const ROWS: Row[] = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["Ctrl", "K"], label: "Open command palette (Windows / Linux)" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["Esc"], label: "Close any modal / dialog" },
  { keys: ["/"], label: "Focus board search on Dashboard" },
  { keys: ["g", "d"], label: "Shortcut: go to Dashboard (inside palette)" },
  { keys: ["g", "j"], label: "Shortcut: go to Jobs (inside palette)" },
];

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  const editable = (el as HTMLElement).isContentEditable;
  return Boolean(editable);
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Trap Tab inside the dialog so aria-modal="true" actually holds.
  useFocusTrap(open, dialogRef);

  const close = useCallback(() => {
    setOpen(false);
    // Return focus to whoever opened the modal.
    previouslyFocusedRef.current?.focus();
  }, []);

  // When opening, remember what was focused so we can restore it on close,
  // and move focus into the dialog so SR/keyboard users land here.
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current =
        (document.activeElement as HTMLElement | null) ?? null;
      setTimeout(() => closeBtnRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    const openEvt = () => setOpen(true);
    window.addEventListener("autoappli:open-shortcuts", openEvt as EventListener);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      // `?` = Shift+/ on US keyboards. Don't steal it from text inputs.
      if (e.key === "?" && !isTypingTarget(document.activeElement)) {
        // Don't reopen if some other modal already owns focus.
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        if (open) close();
        else setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("autoappli:open-shortcuts", openEvt as EventListener);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overscroll-contain">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h2 id="shortcuts-title" className="text-sm font-semibold text-zinc-100">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Close keyboard shortcuts"
            onClick={close}
            className="rounded-md p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <ul className="divide-y divide-zinc-800">
          {ROWS.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-5 py-2.5 text-sm"
            >
              <span className="text-zinc-300">{row.label}</span>
              <span className="flex items-center gap-1">
                {row.keys.map((k, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1">
                    <kbd className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 min-w-[22px] text-center">
                      {k}
                    </kbd>
                    {idx < row.keys.length - 1 && (
                      <span className="text-zinc-600 text-xs">then</span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-zinc-800 text-xs text-zinc-500">
          Tip: press <kbd className="rounded border border-zinc-700 px-1 font-mono">⌘K</kbd> anywhere to open the command palette.
        </div>
      </div>
    </div>
  );
}

"use client";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/types";
import { CheckSquare, Trash2, ArrowRightCircle, X } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS: { id: JobStatus; label: string }[] = [
  { id: "bookmarked", label: "Bookmarked" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "ghosted", label: "Ghosted" },
];

interface BatchActionBarProps {
  selectedCount: number;
  onMoveAll: (status: JobStatus) => void;
  onDeleteAll: () => void;
  onClearSelection: () => void;
}

export function BatchActionBar({
  selectedCount,
  onMoveAll,
  onDeleteAll,
  onClearSelection,
}: BatchActionBarProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-30 -mx-1 px-1 mb-3 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 rounded-lg bg-blue-600/15 border border-blue-500/30 px-4 py-2.5 backdrop-blur-sm">
        <CheckSquare className="h-4 w-4 text-blue-400 shrink-0" />
        <span className="text-sm font-medium text-blue-200">
          {selectedCount} selected
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Move to status */}
          <div className="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-blue-500/30 text-blue-200 hover:bg-blue-500/20 text-xs h-7"
              onClick={() => { setMoveOpen(!moveOpen); setConfirmDelete(false); }}
            >
              <ArrowRightCircle className="h-3.5 w-3.5 mr-1" />
              Move to
            </Button>
            {moveOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl py-1 z-40">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                    onClick={() => {
                      onMoveAll(opt.id);
                      setMoveOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          {!confirmDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs h-7"
              onClick={() => { setConfirmDelete(true); setMoveOpen(false); }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7"
              onClick={() => {
                onDeleteAll();
                setConfirmDelete(false);
              }}
            >
              Confirm delete {selectedCount}
            </Button>
          )}

          {/* Clear */}
          <button
            type="button"
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={() => { onClearSelection(); setMoveOpen(false); setConfirmDelete(false); }}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

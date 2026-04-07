"use client";

import type { ReactNode } from "react";
import { parseResumePlainText, type ResumeBlock } from "@/lib/parse-resume-text";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

function renderBlocks(blocks: ResumeBlock[]): ReactNode[] {
  const out: ReactNode[] = [];
  let bulletRun: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletRun.length === 0) return;
    out.push(
      <ul
        key={`ul-${key++}`}
        className="my-1 ml-4 list-disc space-y-0.5 pl-1 text-[10pt] text-zinc-800 marker:text-zinc-500"
      >
        {bulletRun.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    );
    bulletRun = [];
  };

  for (const b of blocks) {
    switch (b.type) {
      case "name":
        flushBullets();
        out.push(
          <h2
            key={key++}
            className="text-center text-[18pt] font-bold leading-tight tracking-tight text-zinc-950"
          >
            {b.text}
          </h2>
        );
        break;
      case "contact":
        flushBullets();
        out.push(
          <p key={key++} className="mt-1 text-center text-[10pt] text-zinc-600">
            {b.text}
          </p>
        );
        break;
      case "divider":
        flushBullets();
        out.push(<hr key={key++} className="my-3 border-0 border-t border-zinc-300" />);
        break;
      case "section":
        flushBullets();
        out.push(
          <h3
            key={key++}
            className="mt-4 border-b border-zinc-200 pb-0.5 text-[11pt] font-bold text-[#2c3e50] first:mt-0"
          >
            {b.text}
          </h3>
        );
        break;
      case "bullet":
        bulletRun.push(b.text);
        break;
      case "paragraph":
        flushBullets();
        out.push(
          <p key={key++} className="mt-1 text-[10pt] text-zinc-800">
            {b.text}
          </p>
        );
        break;
      default:
        break;
    }
  }
  flushBullets();
  return out;
}

/**
 * On-screen “paper” preview matching the structured PDF layout (name, contact, sections, bullets).
 */
export function ResumeFormattedView({
  text,
  className,
  id,
}: {
  text: string;
  className?: string;
  id?: string;
}) {
  const nodes = useMemo(() => {
    const blocks = parseResumePlainText(text);
    return renderBlocks(blocks);
  }, [text]);

  return (
    <div
      id={id}
      className={cn(
        "rounded-lg border border-zinc-600 bg-white text-zinc-900 shadow-xl shadow-black/25",
        "mx-auto w-full max-w-[8.5in] min-h-[11in] px-[0.75in] py-[0.55in]",
        "font-serif text-[10pt] leading-[1.35]",
        className
      )}
    >
      {nodes}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { parseResumePlainText, type ResumeBlock } from "@/lib/parse-resume-text";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type ResumeTemplateId,
} from "@/lib/resume-templates";

function renderBlocks(
  blocks: ResumeBlock[],
  styles: ReturnType<typeof getTemplate>["preview"],
): ReactNode[] {
  const out: ReactNode[] = [];
  let bulletRun: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletRun.length === 0) return;
    out.push(
      <ul key={`ul-${key++}`} className={styles.bullet}>
        {bulletRun.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>,
    );
    bulletRun = [];
  };

  for (const b of blocks) {
    switch (b.type) {
      case "name":
        flushBullets();
        out.push(
          <h2 key={key++} className={styles.name}>
            {b.text}
          </h2>,
        );
        break;
      case "contact":
        flushBullets();
        out.push(
          <p key={key++} className={styles.contact}>
            {b.text}
          </p>,
        );
        break;
      case "divider":
        flushBullets();
        out.push(<hr key={key++} className={cn("border-0", styles.divider)} />);
        break;
      case "section":
        flushBullets();
        out.push(
          <h3 key={key++} className={styles.section}>
            {b.text}
          </h3>,
        );
        break;
      case "bullet":
        bulletRun.push(b.text);
        break;
      case "paragraph":
        flushBullets();
        out.push(
          <p key={key++} className={styles.paragraph}>
            {b.text}
          </p>,
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
 * On-screen "paper" preview matching the structured PDF/HTML layout.
 *
 * Sprint 7 — accepts a `templateId` so the paper, typography, and section
 * heading style all switch in lockstep with the exported HTML version.
 * Falls back to the Harvard template when omitted (most-common default,
 * matches the previous hard-coded look).
 */
export function ResumeFormattedView({
  text,
  className,
  id,
  templateId,
}: {
  text: string;
  className?: string;
  id?: string;
  templateId?: ResumeTemplateId;
}) {
  const template = getTemplate(templateId ?? DEFAULT_TEMPLATE_ID);

  const nodes = useMemo(() => {
    const blocks = parseResumePlainText(text);
    return renderBlocks(blocks, template.preview);
  }, [text, template]);

  return (
    <div id={id} className={cn(template.preview.container, className)}>
      {nodes}
    </div>
  );
}

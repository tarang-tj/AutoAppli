/**
 * Dialogue presentation primitives for the spotlight stage.
 *
 *   <DropCapText>   first letter of the AI question typeset as a
 *                   theatrical drop-cap in ember.
 *   <ScriptLine>    a single past exchange — speaker label in mono on
 *                   the left, line content on the right. Italic serif
 *                   for the AI side, refined mono for the user side,
 *                   so the script visually reads as a typed cue sheet.
 */

"use client";

export interface DialogueLine {
  role: "ai" | "user";
  text: string;
}

export function DropCapText({ text }: { text: string }) {
  if (!text) return null;
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <>
      <span
        className="float-left mr-2 mt-1 font-[family-name:var(--font-mock-display)] text-[3.5rem] font-black not-italic leading-[0.85] text-[color:var(--stage-ember)] sm:text-[4.5rem]"
        aria-hidden
      >
        {first}
      </span>
      <span className="sr-only">{first}</span>
      {rest}
    </>
  );
}

export function ScriptLine({
  role,
  text,
  dimmed,
}: {
  role: "ai" | "user";
  text: string;
  dimmed?: boolean;
}) {
  const isAi = role === "ai";
  return (
    <div
      className="grid grid-cols-[5.5rem_1fr] gap-3 sm:gap-5"
      style={{ opacity: dimmed ? 0.55 : 1 }}
    >
      <div className="pt-1 font-[family-name:var(--font-mock-mono)] text-[0.62rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]">
        {isAi ? "Interviewer" : "You"}
      </div>
      <div
        className={
          isAi
            ? "font-[family-name:var(--font-mock-display)] text-[1.05rem] italic leading-snug text-[color:var(--stage-bone)]"
            : "font-[family-name:var(--font-mock-mono)] text-[0.92rem] leading-relaxed text-[color:var(--stage-bone-dim)]"
        }
      >
        {text}
      </div>
    </div>
  );
}

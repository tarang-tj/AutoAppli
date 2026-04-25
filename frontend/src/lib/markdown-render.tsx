import { Fragment, type ReactNode } from "react";

/**
 * Tiny markdown renderer for our blog. Intentionally minimal — supports
 * only the constructs we use in `src/app/blog/posts/*.md`:
 *
 *   - `#`, `##`, `###` headings
 *   - paragraphs (blank-line separated)
 *   - `**bold**`, `*italic*`, `` `code` ``
 *   - `[label](url)` links (external open in new tab)
 *   - `- item` bullet lists (consecutive lines)
 *   - `> quote` blockquotes (consecutive lines, joined)
 *   - `---` horizontal rule on its own line
 *
 * No HTML, no images, no tables. If a post needs more, upgrade this file.
 */

// ---- Inline -------------------------------------------------------------

/**
 * Render inline markdown to React nodes. We tokenize by scanning a small
 * set of regexes and prefer the leftmost/longest match — this keeps
 * `**bold with *star* inside**` correct enough for our copy.
 */
function renderInline(text: string, keyPrefix = "i"): ReactNode {
  const out: ReactNode[] = [];
  let cursor = 0;
  let id = 0;

  // Order matters: longer/more-specific patterns first.
  const patterns: Array<{
    re: RegExp;
    build: (m: RegExpExecArray) => ReactNode;
  }> = [
    {
      re: /\[([^\]]+)\]\(([^)\s]+)\)/g,
      build: (m) => {
        const url = m[2];
        const isExternal = /^https?:\/\//i.test(url);
        return (
          <a
            href={url}
            className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {m[1]}
          </a>
        );
      },
    },
    {
      re: /\*\*([^*]+)\*\*/g,
      build: (m) => <strong className="text-white">{m[1]}</strong>,
    },
    {
      re: /\*([^*]+)\*/g,
      build: (m) => <em>{m[1]}</em>,
    },
    {
      re: /`([^`]+)`/g,
      build: (m) => (
        <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[0.9em] text-zinc-200">
          {m[1]}
        </code>
      ),
    },
  ];

  while (cursor < text.length) {
    let best: { index: number; length: number; node: ReactNode } | null = null;
    for (const p of patterns) {
      p.re.lastIndex = cursor;
      const m = p.re.exec(text);
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, length: m[0].length, node: p.build(m) };
      }
    }
    if (!best) {
      out.push(text.slice(cursor));
      break;
    }
    if (best.index > cursor) {
      out.push(text.slice(cursor, best.index));
    }
    out.push(
      <Fragment key={`${keyPrefix}-${id++}`}>{best.node}</Fragment>,
    );
    cursor = best.index + best.length;
  }
  return <>{out}</>;
}

// ---- Block --------------------------------------------------------------

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" };

function tokenize(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }
    if (trimmed === "---") {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h1", text: trimmed.slice(2) });
      i++;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (trimmed.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        buf.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }

    // Paragraph: collect consecutive non-blank, non-special lines.
    const buf: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === "" ||
        t === "---" ||
        t.startsWith("#") ||
        t.startsWith("- ") ||
        t.startsWith("* ") ||
        t.startsWith("> ")
      ) {
        break;
      }
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ").trim() });
  }
  return blocks;
}

export function MarkdownBody({ source }: { source: string }) {
  const blocks = tokenize(source);
  return (
    <div className="prose-blog">
      {blocks.map((b, idx) => {
        const key = `b-${idx}`;
        if (b.kind === "h1") {
          return (
            <h1
              key={key}
              className="mt-10 mb-4 text-3xl font-bold tracking-tight text-white"
            >
              {renderInline(b.text, key)}
            </h1>
          );
        }
        if (b.kind === "h2") {
          return (
            <h2
              key={key}
              className="mt-10 mb-3 text-2xl font-semibold tracking-tight text-white"
            >
              {renderInline(b.text, key)}
            </h2>
          );
        }
        if (b.kind === "h3") {
          return (
            <h3
              key={key}
              className="mt-8 mb-2 text-xl font-semibold tracking-tight text-white"
            >
              {renderInline(b.text, key)}
            </h3>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul
              key={key}
              className="my-4 list-disc space-y-2 pl-6 text-zinc-300"
            >
              {b.items.map((item, j) => (
                <li key={`${key}-${j}`} className="leading-relaxed">
                  {renderInline(item, `${key}-${j}`)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === "quote") {
          return (
            <blockquote
              key={key}
              className="my-6 border-l-4 border-blue-500/60 bg-blue-500/5 px-5 py-3 text-zinc-200 italic"
            >
              {renderInline(b.text, key)}
            </blockquote>
          );
        }
        if (b.kind === "hr") {
          return (
            <hr
              key={key}
              className="my-10 border-0 border-t border-zinc-800"
            />
          );
        }
        return (
          <p
            key={key}
            className="my-4 leading-relaxed text-zinc-300 text-pretty"
          >
            {renderInline(b.text, key)}
          </p>
        );
      })}
    </div>
  );
}

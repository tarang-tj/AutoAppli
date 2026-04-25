import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Blog post utilities — file-system backed, zero external dependencies.
 *
 * Posts live at `src/app/blog/posts/<slug>.md` with a tiny frontmatter
 * header (string values only). We parse with regex and render with a
 * minimal block/inline tokenizer. Heavy parsers (gray-matter, remark,
 * react-markdown) intentionally avoided to keep the bundle slim and
 * the build deterministic.
 */

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date string, e.g. "2026-04-24"
  readingMinutes: number;
}

export interface Post extends PostMeta {
  body: string;
}

const POSTS_DIR = path.join(process.cwd(), "src/app/blog/posts");

// ---- Frontmatter parser -------------------------------------------------

/**
 * Parse a tiny YAML-ish frontmatter block at the top of a markdown file.
 *
 * Supports `key: "value"`, `key: 'value'`, `key: value`, and `key: 12`.
 * Values are returned as strings; numeric coercion happens at the call
 * site for the fields that need it.
 *
 * If no frontmatter block is present, returns the whole input as `body`
 * and an empty meta object.
 */
export function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const [, header, body] = match;
  const meta: Record<string, string> = {};
  for (const line of header.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const kv = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    let value = rawValue.trim();
    // Strip wrapping quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: body.replace(/^\r?\n/, "") };
}

// ---- Loading ------------------------------------------------------------

function metaFromFrontmatter(slug: string, fm: Record<string, string>): PostMeta {
  const readingMinutesRaw = fm.readingMinutes ?? "5";
  const readingMinutes = Number.parseInt(readingMinutesRaw, 10) || 5;
  return {
    slug,
    title: fm.title ?? slug,
    description: fm.description ?? "",
    publishedAt: fm.publishedAt ?? "1970-01-01",
    readingMinutes,
  };
}

export async function getAllPosts(): Promise<PostMeta[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(POSTS_DIR);
  } catch {
    return [];
  }
  const slugs = entries
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));

  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const raw = await fs.readFile(path.join(POSTS_DIR, `${slug}.md`), "utf8");
      const { meta } = parseFrontmatter(raw);
      return metaFromFrontmatter(slug, meta);
    }),
  );

  // Newest first.
  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeSlug || safeSlug !== slug) return null;
  const filePath = path.join(POSTS_DIR, `${safeSlug}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const { meta, body } = parseFrontmatter(raw);
  return { ...metaFromFrontmatter(safeSlug, meta), body };
}

// ---- Formatting helpers -------------------------------------------------

export function formatPublishedAt(iso: string): string {
  // Anchor to UTC noon to avoid TZ rollover surprises.
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

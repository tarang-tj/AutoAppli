"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  Check,
  Copy,
  MousePointer2,
  MoveRight,
  Sparkles,
} from "lucide-react";

/**
 * BookmarkletClient — the interactive part of /bookmarklet.
 *
 * Chrome/Edge/Firefox/Safari all accept draggable `<a>` links whose
 * `href` starts with `javascript:` — dragging onto the bookmarks bar
 * creates a bookmark that runs the code. We render exactly that as
 * the big blue pill, plus a copy button for users who prefer to
 * create the bookmark manually.
 */
export function BookmarkletClient({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: focus + select if Clipboard API is unavailable.
      const ta = document.getElementById("bookmarklet-code") as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-8"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to home
      </Link>

      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200 mb-4">
        <Sparkles className="h-3 w-3" />
        One-click job saving
      </div>

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
        Save any job posting in one click
      </h1>
      <p className="text-zinc-300 text-base leading-relaxed max-w-2xl">
        Drag the button below to your bookmarks bar. When you&apos;re on a
        LinkedIn posting, a Greenhouse board, or a company careers page,
        click it — AutoAppli opens with the URL, title, and description
        already filled in.
      </p>

      {/* The draggable "install" button.
          Showing it as a chunky pill is the industry convention — users
          expect to be able to grab it and drop on their bookmark bar. */}
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={snippet}
            draggable
            onClick={(e) => {
              // Do NOT run the bookmarklet from this page — there's no
              // job here. The user should drag it to the bar instead.
              e.preventDefault();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 cursor-grab active:cursor-grabbing select-none"
          >
            <Bookmark className="h-4 w-4" />
            Save to AutoAppli
          </a>
          <p className="mt-3 text-xs text-zinc-500 flex items-center gap-1.5">
            <MousePointer2 className="h-3 w-3" />
            Drag me to your bookmarks bar
            <MoveRight className="h-3 w-3" />
          </p>
        </div>

        {/* Manual install fallback. */}
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">
              Or copy the code and create a bookmark manually
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            id="bookmarklet-code"
            readOnly
            value={snippet}
            className="w-full h-24 rounded bg-transparent text-[11px] text-zinc-400 font-mono resize-none focus:outline-none"
          />
        </div>
      </div>

      {/* How-to section. Rendered as a numbered list-with-prose so
          screen readers announce ordinal steps. */}
      <div className="mt-10">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-4">
          How to use it
        </h2>
        <ol className="space-y-4">
          {[
            {
              title: "Show your bookmarks bar",
              body: "Chrome / Edge: press Cmd+Shift+B (or Ctrl+Shift+B). Safari: View → Show Favorites Bar.",
              icon: BookmarkPlus,
            },
            {
              title: "Drag the blue button to the bar",
              body: "The cursor should change to a grab. You can rename it later (right-click → Edit).",
              icon: Bookmark,
            },
            {
              title: "Click it on any job posting",
              body: "LinkedIn, Indeed, Greenhouse, Lever, Ashby, company careers pages — all work. A new AutoAppli tab opens with the Add Job dialog pre-filled.",
              icon: Sparkles,
            },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-start gap-4">
                <div className="h-8 w-8 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[11px] font-bold text-zinc-400">
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-200">Privacy:</strong> the bookmarklet only
        passes the page URL and (optionally) the title + meta description to
        AutoAppli. Nothing is transmitted until you click <em>Save</em> in the
        dialog.
      </div>
    </div>
  );
}

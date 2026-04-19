import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { BookmarkletClient } from "./bookmarklet-client";

export const metadata: Metadata = {
  title: "Bookmarklet — Save any job in one click",
  description:
    "Drag the AutoAppli bookmarklet to your bookmarks bar. Click it on any job posting — LinkedIn, Greenhouse, Lever, or a company careers page — to save it straight to your board.",
  alternates: { canonical: "/bookmarklet" },
};

/**
 * /bookmarklet — install page for a drag-to-bookmark-bar shortcut.
 *
 * The bookmarklet itself is a tiny `javascript:` URL that grabs the
 * current page's URL + title, best-effort extracts a meta description,
 * and opens the user's dashboard with the Add Job dialog pre-filled.
 * No backend is involved — it just navigates to a query-string route.
 *
 * Why a separate client component? The draggable `<a href="javascript:…">`
 * works fine in SSR but the "copy to clipboard" and "dragstart visual"
 * affordances need window/clipboard APIs.
 */
export default function BookmarkletPage() {
  const siteUrl = getSiteUrl();

  // Keep this payload as a single line; Chrome's bookmark bar rejects
  // `javascript:` URLs with raw newlines. URL-encoded spaces keep it
  // portable across browsers. The snippet:
  //   - grabs meta[name=description] when present
  //   - falls back to the <title> element
  //   - opens in a new tab with the add-job dialog pre-filled.
  const snippet = `javascript:(function(){var d=document,m=d.querySelector('meta[name="description"]'),desc=m?m.content:'',u=encodeURIComponent(location.href),t=encodeURIComponent(d.title||''),e=encodeURIComponent((desc||'').slice(0,800));window.open('${siteUrl}/dashboard?add=1&url='+u+'&title='+t+'&description='+e,'_blank');})();`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <BookmarkletClient snippet={snippet} />
    </div>
  );
}

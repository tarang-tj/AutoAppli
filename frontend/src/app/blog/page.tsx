import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPublishedAt, getAllPosts } from "@/lib/blog";
import { BlogFooter, BlogHeader } from "@/components/marketing/blog-shell";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export const metadata: Metadata = {
  title: "Blog · AutoAppli",
  description:
    "Honest writing on student internship recruiting — resume tailoring, cold outreach, and why mass-applying tanks your callback rate.",
  alternates: { canonical: "/blog" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    title: "Blog · AutoAppli",
    description:
      "Honest writing on student internship recruiting — tailoring, outreach, and why mass-applying tanks callback rate.",
    url: "/blog",
  },
  twitter: {
    card: "summary",
    title: "Blog · AutoAppli",
    description:
      "Tailoring, outreach, and why mass-applying tanks callback rate.",
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
      style={{ colorScheme: "dark" }}
    >
      <BlogHeader />
      <main className="flex-1">
        <section className="px-6 pt-16 md:pt-24 pb-8 max-w-4xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 mb-6">
            AutoAppli blog
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] text-balance">
            Notes from the internship grind.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed text-pretty">
            Specific, opinionated writing on what actually moves callback
            rate. No buzzword stuffing, no auto-submit pitches. Just the stuff
            we wish someone had told us as juniors.
          </p>
        </section>

        <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
          {posts.length === 0 ? (
            <p className="text-zinc-400">No posts yet. Check back soon.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80 border-t border-zinc-800/80">
              {posts.map((post) => (
                <li key={post.slug} className="py-8">
                  <Link
                    href={`/blog/${post.slug}`}
                    className={`group block rounded-md ${FOCUS_RING}`}
                  >
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                      <time dateTime={post.publishedAt}>
                        {formatPublishedAt(post.publishedAt)}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingMinutes} min read</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-zinc-400 leading-relaxed text-pretty">
                      {post.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-400 group-hover:text-blue-300">
                      Read post
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}

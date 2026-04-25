import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  formatPublishedAt,
  getAllPosts,
  getPostBySlug,
} from "@/lib/blog";
import { MarkdownBody } from "@/lib/markdown-render";
import { BlogFooter, BlogHeader } from "@/components/marketing/blog-shell";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: "Post not found · AutoAppli blog",
      robots: { index: false, follow: false },
    };
  }
  const canonical = `/blog/${post.slug}`;
  return {
    title: `${post.title} · AutoAppli blog`,
    description: post.description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: canonical,
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
      style={{ colorScheme: "dark" }}
    >
      <BlogHeader />
      <main className="flex-1">
        <article className="px-6 pt-12 md:pt-20 pb-10 max-w-3xl mx-auto w-full">
          <Link
            href="/blog"
            className={`inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-8 rounded-md ${FOCUS_RING}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to blog
          </Link>
          <header className="mb-10">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] text-balance">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-3 text-sm text-zinc-500">
              <time dateTime={post.publishedAt}>
                {formatPublishedAt(post.publishedAt)}
              </time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
          </header>

          <MarkdownBody source={post.body} />

          <PostCta />
        </article>
      </main>
      <BlogFooter maxWidth="max-w-3xl" />

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            author: { "@type": "Organization", name: "AutoAppli" },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `/blog/${post.slug}`,
            },
          }),
        }}
      />
    </div>
  );
}

function PostCta() {
  return (
    <aside className="mt-16 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 md:p-8">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-3">
        Try AutoAppli
      </p>
      <h2 className="text-2xl font-semibold text-white tracking-tight">
        Set up the ten minutes that actually matters.
      </h2>
      <p className="mt-3 text-zinc-300 leading-relaxed text-pretty">
        Per-JD resume tailoring, cover letter, recruiter outreach, kanban
        tracker. You still click apply. That’s the point.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/signup"
          className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 ${FOCUS_RING}`}
        >
          Start your internship board
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          href="/discover"
          className={`inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-zinc-200 font-medium hover:bg-zinc-900 hover:border-zinc-600 transition-colors ${FOCUS_RING}`}
        >
          Browse live jobs
        </Link>
      </div>
    </aside>
  );
}

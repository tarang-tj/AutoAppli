import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { getAllPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const baseEntries: MetadataRoute.Sitemap = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/privacy",
    "/terms",
    "/bookmarklet",
    "/discover",
    "/stories",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));

  // Trust-building marketing surfaces — slightly higher priority than blog/vs.
  const trustEntries: MetadataRoute.Sitemap = [
    "/pricing",
    "/about",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Programmatic SEO: /vs/<competitor>/ comparison pages.
  const vsEntries: MetadataRoute.Sitemap = [
    "/vs/lazyapply",
    "/vs/simplify",
    "/vs/huntr",
    "/vs/wonsulting",
    "/vs/teal",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Free interactive tools (programmatic SEO + product demo).
  const toolEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/tools/subject-line-tester`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/tools/resume-keyword-extractor`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/tools/ats-view`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // Blog index + individual posts.
  const posts = await getAllPosts();
  const blogIndexEntry: MetadataRoute.Sitemap = [
    {
      url: `${base}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ];
  const blogPostEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(`${p.publishedAt}T12:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...baseEntries,
    ...trustEntries,
    ...vsEntries,
    ...toolEntries,
    ...blogIndexEntry,
    ...blogPostEntries,
  ];
}

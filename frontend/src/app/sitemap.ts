import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));

  // Programmatic SEO: /vs/<competitor>/ comparison pages.
  const vsEntries: MetadataRoute.Sitemap = [
    "/vs/lazyapply",
    "/vs/simplify",
    "/vs/huntr",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...baseEntries, ...vsEntries];
}

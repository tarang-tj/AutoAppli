import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  const paths = [
    "/",
    "/dashboard",
    "/resume",
    "/outreach",
    "/jobs",
    "/login",
    "/signup",
    "/privacy",
    "/terms",
  ];
  return paths.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/dashboard" ? 1 : path === "/" ? 0.9 : 0.7,
  }));
}

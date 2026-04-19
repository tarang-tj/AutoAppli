import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes AutoAppli installable as a home-screen app on
 * iOS and Android, and drives the "Install" prompt on desktop Chrome/Edge.
 *
 * Next.js auto-discovers `app/manifest.ts` and serves it at
 * `/manifest.webmanifest` with the right Content-Type header.
 *
 * Notes:
 * - Icons reference the existing `icon.svg` in this directory (favicon)
 *   plus the dynamically-generated `apple-icon.tsx` (180×180 for iOS).
 * - `display: "standalone"` launches without browser chrome when installed.
 * - `theme_color` / `background_color` match the dark zinc-950 chrome so
 *   the splash screen doesn't flash white before the app mounts.
 * - `scope` is the root so all pages are captured by the installed app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoAppli — Your entire job search, one workspace",
    short_name: "AutoAppli",
    description:
      "Save roles, tailor resumes with AI, draft outreach, and track every application on a Kanban board.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#09090b",
    theme_color: "#2563eb",
    categories: ["productivity", "business", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
      },
      {
        name: "Add Job",
        short_name: "Add",
        url: "/dashboard?add=1",
      },
      {
        name: "Practice Interview",
        short_name: "Practice",
        url: "/interviews/practice",
      },
    ],
  };
}

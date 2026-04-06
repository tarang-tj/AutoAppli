import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid Turbopack picking a parent directory when multiple lockfiles exist (local monorepos / home).
  // Vercel runs with cwd = Root Directory (e.g. frontend); pinning root stabilizes CI builds.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

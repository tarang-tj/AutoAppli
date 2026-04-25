// To enable bundle analysis, install the analyzer once and re-run with ANALYZE=true:
//   npm install -D @next/bundle-analyzer
//   ANALYZE=true npm run build
// The require() below is wrapped in a try/catch so the build does not fail when
// the package is absent — production deploys (Vercel) don't carry devDependencies.
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.anthropic.com; frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Omit `turbopack.root` / `outputFileTracingRoot`: on Vercel monorepos they must match exactly;
  // `process.cwd()` vs inferred `/vercel/path0` triggers a Next.js warning during build.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Optional bundle analyzer wrapper. Activated only when ANALYZE=true is set
// AND @next/bundle-analyzer is installed (see top-of-file comment for setup).
// Kept defensive so missing package never breaks `next build`.
type ConfigWrapper = (config: NextConfig) => NextConfig;
let withBundleAnalyzer: ConfigWrapper = (cfg) => cfg;
if (process.env.ANALYZE === "true") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded optional dep
    const bundleAnalyzer = require("@next/bundle-analyzer") as
      | ((opts: { enabled: boolean }) => ConfigWrapper)
      | { default: (opts: { enabled: boolean }) => ConfigWrapper };
    const factory = typeof bundleAnalyzer === "function" ? bundleAnalyzer : bundleAnalyzer.default;
    withBundleAnalyzer = factory({ enabled: true });
  } catch {
    // Package not installed — print a hint and fall through unwrapped.
    console.warn(
      "[next.config] ANALYZE=true but @next/bundle-analyzer is not installed.\n" +
        "  Run: npm install -D @next/bundle-analyzer",
    );
  }
}

export default withBundleAnalyzer(nextConfig);

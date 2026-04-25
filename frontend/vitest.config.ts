/**
 * Vitest configuration for the AutoAppli frontend.
 *
 * Stack notes:
 *   - React 19 + Next.js 16. Vitest runs in node with jsdom for DOM tests.
 *   - We use @vitejs/plugin-react so JSX/TSX compile under Vite/esbuild
 *     without needing a separate tsconfig flag.
 *   - css: false skips PostCSS/Tailwind for tests — we don't assert on
 *     computed styles, only on the DOM tree and ARIA semantics.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

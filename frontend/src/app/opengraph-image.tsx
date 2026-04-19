import { ImageResponse } from "next/og";

/**
 * Dynamic Open Graph image for the marketing landing page.
 *
 * Next.js picks this up automatically by filename convention and serves
 * it at `/opengraph-image`. The landing-page metadata in layout.tsx
 * references it via the `openGraph.images` default, so no extra wiring
 * is needed.
 *
 * Rendered at build-time on Vercel. No network calls, no custom fonts —
 * keeps the build fast and the image cacheable.
 */

export const alt = "AutoAppli — AI Job Application Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #09090b 0%, #0b1021 50%, #1a0b2e 100%)",
          padding: "72px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "9999px",
            background: "rgba(59,130,246,0.15)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "9999px",
            background: "rgba(139,92,246,0.12)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "28px",
            fontWeight: 600,
            color: "#fafafa",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "30px",
              fontWeight: 700,
              boxShadow: "0 20px 60px -15px rgba(59,130,246,0.5)",
            }}
          >
            A
          </div>
          AutoAppli
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginTop: "auto",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 16px",
              borderRadius: "9999px",
              border: "1px solid rgba(59,130,246,0.35)",
              background: "rgba(59,130,246,0.12)",
              color: "#93c5fd",
              fontSize: "18px",
              fontWeight: 500,
              alignSelf: "flex-start",
            }}
          >
            AI-powered job search platform
          </div>

          <div
            style={{
              fontSize: "88px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Your entire job</span>
            <span style={{ display: "flex", gap: "20px" }}>
              <span>search,</span>
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #60a5fa, #7dd3fc, #a78bfa)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                one workspace.
              </span>
            </span>
          </div>

          <div
            style={{
              fontSize: "28px",
              color: "#a1a1aa",
              lineHeight: 1.35,
              maxWidth: "900px",
              display: "flex",
            }}
          >
            Save roles, tailor resumes with AI, draft outreach, and track every
            application on a Kanban board.
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#71717a",
            fontSize: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <span>Kanban board</span>
            <span>·</span>
            <span>AI resume tailoring</span>
            <span>·</span>
            <span>Match scoring</span>
          </div>
          <div style={{ display: "flex", color: "#3b82f6", fontWeight: 600 }}>
            autoappli.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

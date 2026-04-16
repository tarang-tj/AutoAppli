import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AutoAppli — AI Job Application Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            marginBottom: 32,
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.3)",
          }}
        >
          <span style={{ color: "white", fontSize: 48, fontWeight: 800 }}>A</span>
        </div>

        {/* Title */}
        <h1
          style={{
            color: "white",
            fontSize: 56,
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          AutoAppli
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "#a1a1aa",
            fontSize: 24,
            margin: "16px 0 0 0",
            maxWidth: 600,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          AI-powered job application platform — resume tailoring, smart outreach, and visual tracking
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["AI Resume Builder", "Job Search", "Cover Letters", "Interview Prep"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 999,
                  padding: "8px 20px",
                  color: "#93c5fd",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>

        {/* URL */}
        <p
          style={{
            color: "#52525b",
            fontSize: 18,
            position: "absolute",
            bottom: 32,
          }}
        >
          autoappli.com
        </p>
      </div>
    ),
    { ...size }
  );
}

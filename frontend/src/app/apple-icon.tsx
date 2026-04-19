import { ImageResponse } from "next/og";

// iOS home-screen icon. Rendered at build/request time via edge runtime.
// Size is the Apple-touch-icon standard 180×180 and matches the blue-600
// brand with the white "A" mark from the app's logo.

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #1e40af 100%)",
          borderRadius: 40,
          color: "white",
          fontSize: 112,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}

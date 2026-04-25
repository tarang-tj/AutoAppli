import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";

/**
 * Route-segment layout for /interview/mock.
 *
 * Scopes a theatrical/cinematic font pairing to this surface only — the
 * rest of the app continues using Inter/Sora from the root layout. Keeps
 * the "mock interview = a performance" metaphor visually distinct without
 * polluting the global font system.
 *
 *   Display (Fraunces)         — AI question text. Italic, characterful,
 *                                feels like dialogue printed in a script.
 *   Mono    (JetBrains Mono)   — user answer + UI labels. Reads like a
 *                                script being typed live in real time.
 */
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-mock-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mock-mono",
});

export const metadata: Metadata = {
  title: "Mock Interview · Stage",
  description:
    "Practice with an AI interviewer. Step under the spotlight, deliver your answer, get scored on clarity, structure, specificity, and relevance.",
};

export default function MockInterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${mono.variable}`}>{children}</div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice Interview",
  description:
    "Run a live mock interview with Claude — pick a role, paste your resume, and rehearse behavioral and technical rounds before the real call.",
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Cover Letter Generator",
  description:
    "Generate a tailored cover letter for any role in seconds — grounded in your resume and the job description.",
  robots: { index: false, follow: false },
};

export default function CoverLetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

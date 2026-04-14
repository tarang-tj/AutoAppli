import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Cover Letter Generator",
  description: "Generate personalized cover letters with AI to stand out to recruiters",
};

export default function CoverLetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

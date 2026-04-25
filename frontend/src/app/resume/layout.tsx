import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Resume Builder",
  description:
    "Tailor your resume to any job description in 30 seconds. Upload, paste a JD, and export an ATS-ready PDF.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

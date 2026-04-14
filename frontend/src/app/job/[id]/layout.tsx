import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job Details",
  description: "View and edit job application details, salary, status, skills, and AI-powered actions.",
};

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

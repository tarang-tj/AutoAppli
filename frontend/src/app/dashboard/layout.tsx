import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track your job applications with a visual Kanban board. Monitor your pipeline, see insights, and stay organized.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Automation Rules",
  description:
    "Set rules that nudge applications between kanban stages — no auto-apply, just less manual bookkeeping.",
  robots: { index: false, follow: false },
};

export default function AutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

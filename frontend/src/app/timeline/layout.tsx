import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Activity Timeline",
  description:
    "See every application, interview, follow-up, and offer event in one chronological feed.",
  robots: { index: false, follow: false },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

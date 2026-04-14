import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Timeline",
  description: "View your complete job search activity history and milestones",
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

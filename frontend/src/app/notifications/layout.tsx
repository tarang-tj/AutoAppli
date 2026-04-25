import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Reminders for follow-ups, interview prep windows, and application deadlines — all in one inbox.",
  robots: { index: false, follow: false },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

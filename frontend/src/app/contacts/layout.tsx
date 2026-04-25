import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Contacts",
  description:
    "Keep recruiters, referrals, and warm intros organized per company so every follow-up has context.",
  robots: { index: false, follow: false },
};

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

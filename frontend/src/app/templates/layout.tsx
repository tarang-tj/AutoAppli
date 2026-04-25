import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Email Templates",
  description:
    "Save reusable cold-email and follow-up templates so every outreach starts from your best draft.",
  robots: { index: false, follow: false },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

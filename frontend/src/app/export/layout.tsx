import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Export Data",
  description:
    "Export your applications, contacts, and timeline to CSV or JSON. Your data, ready to leave when you are.",
  robots: { index: false, follow: false },
};

export default function ExportLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

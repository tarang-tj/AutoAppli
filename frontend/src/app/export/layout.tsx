import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Export",
  description: "Export your job search data and information for backup or analysis",
};

export default function ExportLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

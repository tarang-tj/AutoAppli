import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Job Search",
  description:
    "Search Greenhouse, Lever, Ashby, Indeed, and LinkedIn from one place. Save listings to your kanban with a click.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

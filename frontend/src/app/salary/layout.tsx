import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Salary Tracker",
  description:
    "Compare base, bonus, and equity offers side by side. Make informed decisions with internship and new-grad comp data.",
  robots: { index: false, follow: false },
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

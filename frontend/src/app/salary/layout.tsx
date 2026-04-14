import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Salary Tracker",
  description: "Track and compare compensation across job offers and positions",
};

export default function SalaryLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Contacts",
  description: "Manage your job search CRM with recruiter and contact information",
};

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

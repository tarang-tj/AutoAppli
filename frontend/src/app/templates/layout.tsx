import { AppShell } from "@/components/layout/app-shell";

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

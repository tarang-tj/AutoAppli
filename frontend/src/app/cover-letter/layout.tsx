import { AppShell } from "@/components/layout/app-shell";

export default function CoverLetterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

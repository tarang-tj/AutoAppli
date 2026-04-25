import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Story Library",
  description:
    "Bank STAR-format stories once, reuse them across every interview. Tag-driven mapping shows which questions each story can answer.",
  robots: { index: false, follow: false },
};

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

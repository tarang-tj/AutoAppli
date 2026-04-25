import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "See your application funnel, response rates, and weekly activity at a glance — turn the kanban into signal.",
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

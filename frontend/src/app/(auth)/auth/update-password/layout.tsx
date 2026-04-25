import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New password",
  description: "Choose a new password for your AutoAppli account.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/auth/update-password" },
};

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

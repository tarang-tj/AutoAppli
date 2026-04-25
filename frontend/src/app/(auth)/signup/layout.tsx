import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your AutoAppli account and start tracking internship applications.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

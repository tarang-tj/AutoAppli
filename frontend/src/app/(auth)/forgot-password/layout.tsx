import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Send a password reset link to your AutoAppli account email.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

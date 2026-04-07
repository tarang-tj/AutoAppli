import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AutoAppli — AI Job Application Platform",
    template: "%s · AutoAppli",
  },
  description:
    "Streamline your job search with AI-powered resume tailoring, smart outreach, and visual application tracking.",
  applicationName: "AutoAppli",
  keywords: [
    "job search",
    "resume",
    "AI resume",
    "job applications",
    "career",
    "outreach",
  ],
  authors: [{ name: "AutoAppli" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AutoAppli",
    title: "AutoAppli — AI Job Application Platform",
    description:
      "Streamline your job search with AI-powered resume tailoring, smart outreach, and visual application tracking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli — AI Job Application Platform",
    description:
      "Streamline your job search with AI-powered resume tailoring, smart outreach, and visual application tracking.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}

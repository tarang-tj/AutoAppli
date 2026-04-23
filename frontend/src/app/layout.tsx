import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { Toaster } from "sonner";
import { GlobalErrorListener } from "@/components/layout/global-error-listener";

const siteUrl = getSiteUrl();

const DESCRIPTION =
  "Save roles, tailor resumes with AI in 30 seconds, draft outreach, and track every application on a Kanban board. Free forever tier, no credit card required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AutoAppli — Your entire job search, one workspace",
    template: "%s · AutoAppli",
  },
  description: DESCRIPTION,
  applicationName: "AutoAppli",
  keywords: [
    "job search",
    "AI resume",
    "resume builder",
    "job tracker",
    "Kanban job board",
    "cover letter generator",
    "cold outreach",
    "ATS resume",
    "application tracker",
    "career tools",
  ],
  authors: [{ name: "AutoAppli" }],
  creator: "AutoAppli",
  publisher: "AutoAppli",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AutoAppli",
    title: "AutoAppli — Your entire job search, one workspace",
    description: DESCRIPTION,
    // `opengraph-image.tsx` at the app-root is auto-discovered by Next.js
    // and used as the default OG image; no explicit `images` entry needed.
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli — Your entire job search, one workspace",
    description: DESCRIPTION,
    creator: "@autoappli",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <GlobalErrorListener />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "AutoAppli",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: siteUrl,
              description: DESCRIPTION,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            }),
          }}
        />
        {children}
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}

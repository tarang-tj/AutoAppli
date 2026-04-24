import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { GlobalErrorListener } from "@/components/layout/global-error-listener";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";

const siteUrl = getSiteUrl();

const DESCRIPTION =
  "Find internships from Greenhouse, Lever, Ashby, Indeed, and LinkedIn. Tailor your resume in 30 seconds. Track everything on a kanban. You still hit apply. Built by a CS student for CS students.";

const SITE_TITLE = "AutoAppli: Job-search workspace for students";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: "%s · AutoAppli",
  },
  description: DESCRIPTION,
  applicationName: "AutoAppli",
  keywords: [
    "internship search",
    "student job search",
    "AI resume tailoring",
    "CS internships",
    "new grad jobs",
    "application tracker",
    "kanban job board",
    "cover letter generator",
    "cold outreach",
    "Greenhouse jobs",
    "Lever jobs",
    "Ashby jobs",
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
    title: SITE_TITLE,
    description: DESCRIPTION,
    // `opengraph-image.tsx` at the app-root is auto-discovered by Next.js
    // and used as the default OG image; no explicit `images` entry needed.
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <ThemeProvider>
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
          <CommandPalette />
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

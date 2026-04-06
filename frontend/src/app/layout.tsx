import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoAppli — AI Job Application Platform",
  description:
    "Streamline your job search with AI-powered resume tailoring, smart outreach, and visual application tracking.",
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

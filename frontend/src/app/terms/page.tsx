import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using AutoAppli.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center px-4 py-12">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Terms of service</CardTitle>
          <p className="text-sm text-zinc-400">
            Last updated April 6, 2026. Replace this page with counsel-reviewed terms before a public launch.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p>
            These placeholder terms outline topics you should cover with a lawyer before inviting real users.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-300">Service description:</strong> Define what AutoAppli does and
              does not guarantee (e.g. no promise of interviews or employment).
            </li>
            <li>
              <strong className="text-zinc-300">Acceptable use:</strong> Prohibit abuse, scraping that
              violates third-party sites, and unlawful content.
            </li>
            <li>
              <strong className="text-zinc-300">AI-generated content:</strong> Users are responsible for
              reviewing and editing outputs; AI may be inaccurate.
            </li>
            <li>
              <strong className="text-zinc-300">Liability:</strong> Limitation of liability and disclaimers
              appropriate to your entity and jurisdictions.
            </li>
            <li>
              <strong className="text-zinc-300">Termination:</strong> When accounts or access may be suspended
              or ended.
            </li>
          </ul>
          <p className="text-zinc-500 text-xs">
            This is not legal advice. Your terms should match your product, billing, and regions of operation.
          </p>
          <Link href="/dashboard" className="inline-block text-blue-400 hover:underline text-sm">
            ← Back to app
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

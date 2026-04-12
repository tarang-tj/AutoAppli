import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AutoAppli handles your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center px-4 py-12">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Privacy policy</CardTitle>
          <p className="text-sm text-zinc-400">
            Last updated April 6, 2026. Replace this page with counsel-reviewed text before a public launch.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <p>
            AutoAppli helps you manage job applications and generate tailored materials. This placeholder
            summarizes typical practices you should formalize with your legal and privacy advisors.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li>
              <strong className="text-zinc-300">Account data:</strong> Authentication may be provided by
              Supabase. Review Supabase&apos;s documentation and your project settings for data residency
              and retention.
            </li>
            <li>
              <strong className="text-zinc-300">Resume and job content:</strong> Text you upload or paste
              is processed to provide the service. Describe what you store, for how long, and who may access
              it (including subprocessors such as AI providers).
            </li>
            <li>
              <strong className="text-zinc-300">Analytics:</strong> If you add analytics or error reporting,
              disclose those tools and opt-out where required.
            </li>
            <li>
              <strong className="text-zinc-300">Contact:</strong> Add an email or form for privacy requests
              (access, deletion, etc.) as applicable in your jurisdictions.
            </li>
          </ul>
          <p className="text-zinc-500 text-xs">
            This is not legal advice. Draft a policy that matches your actual product, hosting, and regions.
          </p>
          <Link href="/dashboard" className="inline-block text-blue-400 hover:underline text-sm">
            ← Back to app
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

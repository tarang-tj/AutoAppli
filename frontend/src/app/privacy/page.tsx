import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy — AutoAppli",
  description: "How AutoAppli collects, uses, and protects your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center px-4 py-12">
      <Card className="w-full max-w-3xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Privacy Policy</CardTitle>
          <p className="text-sm text-zinc-400">Last updated April 13, 2026</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. What we collect</h2>
            <p>
              When you create an account, AutoAppli stores your email address, display name, and
              optional profile information (headline, phone, location, LinkedIn URL, portfolio URL,
              and bio). We also store data you choose to provide while using the service: resumes,
              job descriptions, generated documents, job tracking entries, interview notes, contacts,
              salary data, and automation rules.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. How we use your data</h2>
            <p>
              Your data is used exclusively to power AutoAppli features — resume tailoring, cover
              letter generation, outreach drafting, interview preparation, job tracking, analytics,
              and notifications. We do not sell, rent, or share your personal data with third parties
              for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. AI processing</h2>
            <p>
              When you use AI-powered features (resume tailoring, cover letters, outreach messages,
              interview prep, resume review), the relevant text you provide — such as your resume and
              target job description — is sent to Anthropic&apos;s Claude API for processing. These
              requests are not used by Anthropic to train models. Refer to{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Anthropic&apos;s privacy policy
              </a>{" "}
              for details on how they handle API data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Data storage</h2>
            <p>
              Your data is stored securely in Supabase-hosted infrastructure with row-level security
              policies ensuring that only you can access your own records. All connections use TLS
              encryption in transit, and data is encrypted at rest by the hosting provider.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">5. Job search data</h2>
            <p>
              When you use the job search feature, your search queries are sent to the Adzuna Jobs
              API to retrieve listings. Search history (query, location, result count) is stored in
              your account to let you revisit past searches. Job listing data is cached to reduce
              redundant API calls.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Authentication</h2>
            <p>
              Authentication is handled by Supabase Auth. If you sign in with Google OAuth, we
              receive your name and email from Google — we do not access your Google contacts,
              calendar, or other data. Passwords are never stored in plain text; they are hashed by
              Supabase using bcrypt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Your rights</h2>
            <p>
              You can export all your data as JSON from the Settings page at any time. You may also
              request deletion of your account and all associated data by contacting us. Upon
              deletion, all personal data is removed from our databases within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">8. Cookies and analytics</h2>
            <p>
              AutoAppli uses essential cookies for session management and authentication. We do not
              use third-party tracking cookies or advertising trackers. If analytics tools are added
              in the future, this policy will be updated accordingly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Changes will be reflected on this page
              with an updated &quot;Last updated&quot; date. Continued use of AutoAppli after changes
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">10. Contact</h2>
            <p>
              For privacy-related questions or data requests, email{" "}
              <a href="mailto:privacy@autoappli.com" className="text-blue-400 hover:underline">
                privacy@autoappli.com
              </a>
              .
            </p>
          </section>

          <div className="pt-4 border-t border-zinc-800">
            <Link
              href="/dashboard"
              className="inline-block text-blue-400 hover:underline text-sm"
            >
              &larr; Back to app
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

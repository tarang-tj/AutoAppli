import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service — AutoAppli",
  description: "Terms and conditions for using AutoAppli.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center px-4 py-12">
      <Card className="w-full max-w-3xl bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Terms of Service</CardTitle>
          <p className="text-sm text-zinc-400">Last updated April 13, 2026</p>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-2">1. Service description</h2>
            <p>
              AutoAppli is a job application management platform that helps you search for jobs,
              tailor resumes, generate cover letters and outreach messages, prepare for interviews,
              and track your application pipeline. The service is provided as-is and does not
              guarantee employment outcomes, interview invitations, or response rates.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">2. Eligibility</h2>
            <p>
              You must be at least 16 years old to use AutoAppli. By creating an account, you
              represent that you meet this age requirement and that the information you provide is
              accurate.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">3. Your account</h2>
            <p>
              You are responsible for maintaining the security of your account credentials. Do not
              share your password or allow others to access your account. Notify us immediately if
              you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">4. Acceptable use</h2>
            <p>
              You agree not to use AutoAppli to: submit fraudulent job applications or
              misrepresent your qualifications; scrape, harvest, or systematically download data
              from third-party job sites in violation of their terms; upload malicious content,
              spam, or content that violates the rights of others; attempt to circumvent
              rate limits, security controls, or access restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">
              5. AI-generated content
            </h2>
            <p>
              AutoAppli uses AI (Anthropic&apos;s Claude) to generate tailored resumes, cover
              letters, outreach messages, and interview preparation materials. AI outputs may
              contain inaccuracies, hallucinations, or suggestions that do not reflect your actual
              experience. You are solely responsible for reviewing, editing, and verifying all
              AI-generated content before use. AutoAppli and its AI providers disclaim
              liability for inaccuracies in generated content.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">6. Your content</h2>
            <p>
              You retain ownership of all content you upload (resumes, notes, contacts, etc.).
              By uploading content, you grant AutoAppli a limited license to process and store
              that content solely for the purpose of providing the service. We will not use your
              content for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">7. Data and privacy</h2>
            <p>
              Your use of AutoAppli is also governed by our{" "}
              <Link href="/privacy" className="text-blue-400 hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">
              8. Limitation of liability
            </h2>
            <p>
              AutoAppli is provided &quot;as is&quot; without warranties of any kind, express or
              implied. To the maximum extent permitted by law, AutoAppli shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages, including
              loss of profits, data, or employment opportunities, arising from your use of or
              inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">9. Termination</h2>
            <p>
              You may delete your account at any time. We reserve the right to suspend or
              terminate accounts that violate these terms or engage in abusive behavior. Upon
              termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">10. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Material changes will be communicated
              through the service. Continued use of AutoAppli after changes constitutes acceptance
              of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-2">11. Contact</h2>
            <p>
              For questions about these terms, email{" "}
              <a href="mailto:support@autoappli.com" className="text-blue-400 hover:underline">
                support@autoappli.com
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

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Star, Zap, BarChart3, Shield } from "lucide-react";
import { useState } from "react";

interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  bestFor: string;
  file: string;
  icon: React.ReactNode;
  accent: string;
  features: string[];
}

const TEMPLATES: ResumeTemplate[] = [
  {
    id: "harvard",
    name: "Harvard Classic",
    description:
      "The gold-standard format used by Harvard's Office of Career Services. Clean serif typography, crisp section dividers, and a traditional layout that recruiters trust. Time-tested and universally accepted.",
    tags: ["Classic", "Serif", "Professional"],
    bestFor: "Investment banking, consulting, law, Big Tech, any formal application",
    file: "/templates/harvard-resume-template.pdf",
    icon: <Star className="h-5 w-5" />,
    accent: "text-amber-400",
    features: [
      "Traditional serif typography (Times New Roman)",
      "Clean horizontal section dividers",
      "Education-first layout for students",
      "Balanced whitespace for easy scanning",
    ],
  },
  {
    id: "modern",
    name: "Modern Clean",
    description:
      "A contemporary sans-serif design with a subtle gradient accent and pill-shaped skill tags. Stands out while staying professional. Designed for tech and startup environments.",
    tags: ["Modern", "Sans-serif", "Tech"],
    bestFor: "Software engineering, product management, startups, tech companies",
    file: "/templates/modern-clean-template.pdf",
    icon: <Zap className="h-5 w-5" />,
    accent: "text-blue-400",
    features: [
      "Clean Helvetica typography",
      "Gradient accent header bar",
      "Pill-shaped skill tags for easy scanning",
      "Experience-first layout for industry roles",
    ],
  },
  {
    id: "ats",
    name: "ATS-Optimized",
    description:
      "Engineered to score highest on Applicant Tracking Systems. No columns, no graphics, no fancy formatting that confuses parsers. Pure text hierarchy that both robots and humans love.",
    tags: ["ATS-Friendly", "Simple", "High-Pass"],
    bestFor: "Large companies, government, defense contractors, any application with ATS screening",
    file: "/templates/ats-optimized-template.pdf",
    icon: <Shield className="h-5 w-5" />,
    accent: "text-emerald-400",
    features: [
      "Single-column, no graphics or tables",
      "Standard section headings ATS systems expect",
      "Summary section for keyword matching",
      "Bullet-point-heavy for easy parsing",
    ],
  },
  {
    id: "data",
    name: "Data & Analytics",
    description:
      "Tailored for data roles with a two-column skills section, green accent bar, and a layout that highlights technical depth. Perfect for showcasing pipeline work, tools, and quantified results.",
    tags: ["Data", "Analytics", "Technical"],
    bestFor: "Data engineering, data science, analytics, ML engineering, business intelligence",
    file: "/templates/data-analytics-template.pdf",
    icon: <BarChart3 className="h-5 w-5" />,
    accent: "text-teal-400",
    features: [
      "Skills-first layout with two-column grid",
      "Green accent for visual hierarchy",
      "Organized by technical categories",
      "Emphasis on quantified impact metrics",
    ],
  },
];

function TemplateCard({ template }: { template: ResumeTemplate }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = template.file;
      link.download = template.file.split("/").pop() || "resume-template.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(false), 1000);
    }
  };

  const headingId = `template-heading-${template.id}`;

  return (
    <Card
      className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group"
      aria-labelledby={headingId}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`${template.accent}`} aria-hidden="true">{template.icon}</div>
            <h3 id={headingId} className="text-lg font-semibold text-white">{template.name}</h3>
          </div>
          <div className="flex gap-1.5">
            {template.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] border-zinc-700 text-zinc-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 leading-relaxed mb-3">
          {template.description}
        </p>

        {/* Best For */}
        <div className="mb-3">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Best for:{" "}
          </span>
          <span className="text-xs text-zinc-300">{template.bestFor}</span>
        </div>

        {/* Features */}
        <ul className="grid grid-cols-2 gap-1.5 mb-4 list-none">
          {template.features.map((f) => (
            <li
              key={f}
              className="text-[11px] text-zinc-500 flex items-start gap-1.5"
            >
              <span className={`mt-0.5 ${template.accent}`} aria-hidden="true">&#8226;</span>
              {f}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            aria-busy={downloading}
            aria-label={`Download ${template.name} resume template PDF`}
            className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloading ? "Downloading…" : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-white gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={() => window.open(template.file, "_blank")}
            aria-label={`Preview ${template.name} resume template (opens in new tab)`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResumeTemplatesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-400" aria-hidden="true" />
            Resume Templates
          </h1>
          <p className="text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Professional, recruiter-tested templates ready to download and customize. Each is
            optimized for a different purpose — pick the one that fits your target role, then use
            our AI resume tailor to fill it in.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-2">
              How to use these templates
            </h3>
            <ol className="text-sm text-zinc-400 space-y-1.5 list-decimal list-inside">
              <li>Download the PDF template that matches your target role</li>
              <li>Open it and note the structure and placeholder text</li>
              <li>
                Go to the <span className="text-blue-400">Resume Builder</span> page, paste your
                existing resume, and add a job description
              </li>
              <li>
                Our AI will tailor your resume to match the job while following the template&rsquo;s
                format and best practices
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

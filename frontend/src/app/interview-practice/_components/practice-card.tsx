import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * PracticeCard — a single destination card on the /interview-practice index.
 *
 * Stateless presentational component; all data is passed as props so the
 * index page can keep the card data co-located and readable at a glance.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export interface PracticeCardProps {
  href: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  /** Optional badge label, e.g. "AI-powered" or "Browser-only" */
  badge?: string;
}

export function PracticeCard({ href, title, blurb, icon, badge }: PracticeCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 ${FOCUS_RING}`}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-300">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{blurb}</p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-300 group-hover:text-blue-200">
        Open
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

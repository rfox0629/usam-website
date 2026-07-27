import Link from "next/link";
import type { NewsletterIssue } from "@/src/data/newsletter-fixtures";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function formatIssueDate(publishedAt: string) {
  return new Date(`${publishedAt}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function NewsletterArchiveCard({ issue }: { issue: NewsletterIssue }) {
  return (
    <Link
      className="group block rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6 transition-colors duration-200 hover:border-usam-gold/50 hover:bg-white/[0.04]"
      href={`/newsletter/${issue.slug}`}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Issue {issue.issueNumber} &middot; {formatIssueDate(issue.publishedAt)}
      </p>
      <h3 className="mt-3 text-xl font-bold leading-tight text-stone-100 md:text-2xl" style={{ fontFamily: font.oswald }}>
        {issue.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-400">{issue.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {issue.topics.map((topic) => (
          <span className="rounded-full border border-stone-700 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-stone-400" key={topic}>
            {topic}
          </span>
        ))}
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Read Issue
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrimaryNav } from "@/components/PrimaryNav";
import { NewsletterSubscribeForm } from "@/components/newsletter/NewsletterSubscribeForm";
import { getNewsletterIssueBySlug, newsletterIssues } from "@/src/data/newsletter-fixtures";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";

export const dynamicParams = false;

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function formatIssueDate(publishedAt: string) {
  return new Date(`${publishedAt}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function generateStaticParams() {
  return newsletterIssues.map((issue) => ({ slug: issue.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = getNewsletterIssueBySlug(slug);

  if (!issue) {
    return { title: "Newsletter | USA Missionaries" };
  }

  const url = `${getCanonicalSiteUrl()}/newsletter/${issue.slug}`;

  return {
    alternates: { canonical: url },
    description: issue.excerpt,
    openGraph: {
      description: issue.excerpt,
      siteName: "USA Missionaries",
      title: issue.title,
      type: "article",
      url,
    },
    title: `${issue.title} | USA Missionaries`,
  };
}

export default async function NewsletterIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = getNewsletterIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  const issueIndex = newsletterIssues.findIndex((candidate) => candidate.slug === issue.slug);
  const olderIssue = newsletterIssues[issueIndex + 1];
  const newerIssue = issueIndex > 0 ? newsletterIssues[issueIndex - 1] : undefined;

  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <article className="px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <Link className="text-xs uppercase tracking-[0.18em] text-stone-500 hover:text-usam-gold" href="/newsletter" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            ← All Issues
          </Link>

          <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Issue {issue.issueNumber} &middot; {formatIssueDate(issue.publishedAt)}
          </p>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.1] text-stone-100" style={{ fontFamily: font.oswald }}>
            {issue.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-400">{issue.excerpt}</p>

          <div className="mt-10 space-y-8 border-t border-stone-900/80 pt-10">
            {issue.readingBlocks.map((block, index) => (
              <div key={`${issue.slug}-${index}`}>
                {block.heading ? (
                  <h2 className="text-xl font-bold leading-tight text-stone-100 md:text-2xl" style={{ fontFamily: font.oswald }}>
                    {block.heading}
                  </h2>
                ) : null}
                <p className="mt-3 text-[15.5px] leading-8 text-stone-400">{block.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6">
            <NewsletterSubscribeForm
              description="Never miss a story from the field — one email a month, unsubscribe anytime."
              title="Enjoyed this issue?"
            />
          </div>

          <nav className="mt-10 flex items-center justify-between gap-4 border-t border-stone-900/80 pt-6 text-sm">
            {olderIssue ? (
              <Link className="text-stone-400 hover:text-usam-gold" href={`/newsletter/${olderIssue.slug}`}>
                ← Issue {olderIssue.issueNumber}
              </Link>
            ) : (
              <span />
            )}
            {newerIssue ? (
              <Link className="text-stone-400 hover:text-usam-gold" href={`/newsletter/${newerIssue.slug}`}>
                Issue {newerIssue.issueNumber} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </article>
    </main>
  );
}

import type { Metadata } from "next";
import { PrimaryNav } from "@/components/PrimaryNav";
import { NewsletterSubscribeForm } from "@/components/newsletter/NewsletterSubscribeForm";
import { newsletterIssues } from "@/src/data/newsletter-fixtures";
import { getCanonicalSiteUrl } from "@/src/lib/site-url";
import { NewsletterArchiveCard } from "./NewsletterArchiveCard";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  alternates: {
    canonical: `${getCanonicalSiteUrl()}/newsletter`,
  },
  description: "Field stories, prayer needs, and ministry updates from USA Missionaries — read past issues or subscribe.",
  title: "Newsletter | USA Missionaries",
};

export default function NewsletterArchivePage() {
  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <section className="border-b border-stone-900/80 px-6 pb-16 pt-28 md:pt-32">
        <div className="mx-auto max-w-6xl">
          <p
            className="flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] text-usam-gold"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Newsletter
            <span aria-hidden="true" className="h-px w-14 bg-usam-gold/55" />
          </p>
          <h1
            className="mt-5 max-w-2xl text-[clamp(2.2rem,5vw,3.25rem)] font-bold leading-[1.1] text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            Stories From the Table
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-400">
            One email a month with real stories from the field, specific prayer needs, and what God is doing
            through everyday conversations at the kitchen table.
          </p>

          <div className="mt-10 max-w-xl rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6">
            <NewsletterSubscribeForm />
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani }}>
            Past Issues
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {newsletterIssues.map((issue) => (
              <NewsletterArchiveCard issue={issue} key={issue.slug} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

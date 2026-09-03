import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { getPublishedNewsletters } from "@/src/lib/communications/data";

export const metadata: Metadata = {
  title: "Newsletter | USA Missionaries",
  description: "USA Missionaries newsletter archive.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

function formatDate(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function NewsletterArchivePage() {
  const newsletters = await getPublishedNewsletters();

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-stone-950">
      <PrimaryNav active="mission" />

      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 border-b border-stone-300/70 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Archive
              </p>
              <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.95] text-stone-950 md:text-6xl" style={{ fontFamily: font.oswald }}>
                Newsletter
              </h1>
            </div>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950" href="/subscribe">
              Subscribe
            </Link>
          </div>

          <div className="mt-8 divide-y divide-stone-300/70 border-y border-stone-300/70">
            {newsletters.length > 0 ? newsletters.map((newsletter) => (
              <Link
                key={newsletter.id}
                className="grid gap-3 py-6 transition-colors hover:bg-white/55 md:grid-cols-[150px_1fr_auto] md:items-center md:px-4"
                href={`/newsletter/${newsletter.slug}`}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {formatDate(newsletter.published_at)}
                </p>
                <div>
                  <h2 className="text-2xl font-semibold text-stone-950">
                    {newsletter.title}
                  </h2>
                  {newsletter.summary ? (
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                      {newsletter.summary}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-[#7a5a12]">Read</span>
              </Link>
            )) : (
              <div className="py-10 text-sm leading-7 text-stone-600">
                No newsletter issues have been published yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { formatCommunicationDate, loadPublishedNewsletterArchive } from "@/src/lib/communications/newsletter";

export const metadata: Metadata = {
  description: "Read published USA Missionaries newsletter updates.",
  title: "Newsletter | USA Missionaries",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default async function NewsletterArchivePage() {
  const archive = await loadPublishedNewsletterArchive();

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />

      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:pt-28">
        <div className="absolute inset-0">
          <img
            alt=""
            className="h-full w-full object-cover opacity-25"
            src="/images/vision/ryan-brooke-ministry-01.jpg"
          />
          <div className="absolute inset-0 bg-[#0D0D0D]/78" />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Newsletter
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-none tracking-normal text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Field updates
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300 md:text-lg">
            Public updates from USA Missionaries.
          </p>
          <Link
            className="mt-8 inline-flex min-h-12 items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C]"
            href="/subscribe"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            Subscribe
          </Link>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-12 text-stone-950 md:py-16">
        <div className="mx-auto max-w-5xl">
          {archive.error ? (
            <div className="border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
              {archive.error}
            </div>
          ) : null}

          {archive.publications.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {archive.publications.map((publication) => (
                <article key={publication.id} className="border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-6">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#80600f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {formatCommunicationDate(publication.published_at)}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold leading-none text-stone-950" style={{ fontFamily: font.oswald }}>
                    {publication.title}
                  </h2>
                  {publication.preview_text ? (
                    <p className="mt-4 text-sm leading-7 text-stone-600">
                      {publication.preview_text}
                    </p>
                  ) : null}
                  <Link className="mt-5 inline-flex text-sm font-semibold text-[#80600f] hover:text-stone-950" href={`/newsletter/${publication.slug}`}>
                    Read update
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-stone-200 bg-white p-8 text-center text-sm leading-7 text-stone-600 shadow-[0_24px_80px_rgba(13,13,13,0.08)]">
              No public newsletter updates have been published yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

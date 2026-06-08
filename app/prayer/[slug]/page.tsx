import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dosPrayerResourceAttribution, dosPrayerResources, getDosPrayerResourceBySlug, getDosPrayerResourceSlugs } from "@/src/lib/dos/prayer-resources";

type PrayerResourcePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getDosPrayerResourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PrayerResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = getDosPrayerResourceBySlug(slug);

  if (!resource) {
    return {
      title: "Prayer Resource | DOS",
    };
  }

  return {
    description: resource.description,
    title: `${resource.title} | DOS Prayer`,
  };
}

export default async function PrayerResourcePage({ params }: PrayerResourcePageProps) {
  const { slug } = await params;
  const resource = getDosPrayerResourceBySlug(slug);

  if (!resource) {
    notFound();
  }

  const shareHref = `mailto:?subject=${encodeURIComponent(resource.title)}&body=${encodeURIComponent(`Here is a prayer resource from DOS:\n\n/prayer/${resource.slug}`)}`;

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#0D0D0D]">
      <article className="mx-auto max-w-2xl">
        <header className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(13,13,13,0.10)] backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0D0D0D]">
            DOS Prayer
          </p>
          <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em] text-[#0D0D0D] md:text-5xl">
            {resource.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#0D0D0D]/70">
            {resource.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-usam-gold/15 px-3 py-1.5 text-xs font-black text-[#0D0D0D]">
              {resource.category}
            </span>
            <span className="rounded-full border border-[#C2A14E]/30 bg-white px-3 py-1.5 text-xs font-black text-[#0D0D0D]/70">
              Prayer Resource
            </span>
          </div>
          <p className="mt-4 rounded-2xl border border-[#C2A14E]/30 bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#0D0D0D]/70">
            {dosPrayerResourceAttribution}
          </p>
        </header>

        <section className="mt-4 grid gap-4">
          <div id="prayer" className="rounded-[28px] border border-[#C2A14E]/30 bg-white p-5 shadow-[0_16px_44px_rgba(13,13,13,0.07)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0D0D0D]">
              Prayer
            </p>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#0D0D0D]">
              {resource.prayerText}
            </p>
          </div>

          <div className="rounded-[28px] border border-[#C2A14E]/20 bg-white p-5 shadow-[0_16px_44px_rgba(13,13,13,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0D0D0D]/55">
              Key Scriptures
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {resource.keyScriptures.map((scripture) => (
                <span className="rounded-full bg-usam-gold/15 px-3 py-1.5 text-sm font-bold text-[#0D0D0D]" key={scripture}>
                  {scripture}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#C2A14E]/20 bg-white p-5 shadow-[0_16px_44px_rgba(13,13,13,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0D0D0D]/55">
              Reflection Questions
            </p>
            <ol className="mt-4 grid gap-3 text-base leading-7 text-[#0D0D0D]">
              {resource.reflectionQuestions.map((question, index) => (
                <li className="flex gap-3" key={question}>
                  <span className="font-black text-[#0D0D0D]">{index + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[28px] border border-[#C2A14E]/20 bg-white p-5 shadow-[0_16px_44px_rgba(13,13,13,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0D0D0D]/55">
              Follow-Up Suggestions
            </p>
            <ul className="mt-4 grid gap-3 text-base leading-7 text-[#0D0D0D]">
              {resource.followUpSuggestions.map((suggestion) => (
                <li className="flex gap-3" key={suggestion}>
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D0D0D]" aria-hidden="true" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-[0_16px_44px_rgba(13,13,13,0.06)] backdrop-blur sm:grid-cols-3">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0D0D0D] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(13,13,13,0.22)]" href="#prayer">
              Pray Now
            </a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C2A14E]/30 bg-white px-4 text-sm font-black text-[#0D0D0D]" href={shareHref}>
              Send Link
            </a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C2A14E]/35 bg-usam-gold/12 px-4 text-sm font-black text-[#0D0D0D]" href="/dos">
              Save to Follow-Up
            </a>
          </div>

          <p className="px-2 text-center text-xs leading-5 text-[#0D0D0D]/55">{dosPrayerResourceAttribution}</p>
        </section>
      </article>
    </main>
  );
}

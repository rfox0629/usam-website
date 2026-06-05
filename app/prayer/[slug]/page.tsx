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
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FBFF_0%,#FFFFFF_42%,#FFF7ED_100%)] px-4 py-6 text-[#0F172A]">
      <article className="mx-auto max-w-2xl">
        <header className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(37,99,235,0.10)] backdrop-blur">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2563EB]">
            DOS Prayer
          </p>
          <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.045em] text-[#0F172A] md:text-5xl">
            {resource.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#475569]">
            {resource.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-black text-[#1D4ED8]">
              {resource.category}
            </span>
            <span className="rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-xs font-black text-[#475569]">
              Prayer Resource
            </span>
          </div>
          <p className="mt-4 rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold leading-5 text-[#475569]">
            {dosPrayerResourceAttribution}
          </p>
        </header>

        <section className="mt-4 grid gap-4">
          <div id="prayer" className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_16px_44px_rgba(37,99,235,0.07)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563EB]">
              Prayer
            </p>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-[#0F172A]">
              {resource.prayerText}
            </p>
          </div>

          <div className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_44px_rgba(37,99,235,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
              Key Scriptures
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {resource.keyScriptures.map((scripture) => (
                <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-sm font-bold text-[#1D4ED8]" key={scripture}>
                  {scripture}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_44px_rgba(37,99,235,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
              Reflection Questions
            </p>
            <ol className="mt-4 grid gap-3 text-base leading-7 text-[#0F172A]">
              {resource.reflectionQuestions.map((question, index) => (
                <li className="flex gap-3" key={question}>
                  <span className="font-black text-[#2563EB]">{index + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_16px_44px_rgba(37,99,235,0.055)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
              Follow-Up Suggestions
            </p>
            <ul className="mt-4 grid gap-3 text-base leading-7 text-[#0F172A]">
              {resource.followUpSuggestions.map((suggestion) => (
                <li className="flex gap-3" key={suggestion}>
                  <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-[0_16px_44px_rgba(37,99,235,0.06)] backdrop-blur sm:grid-cols-3">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]" href="#prayer">
              Pray Now
            </a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-black text-[#1D4ED8]" href={shareHref}>
              Send Link
            </a>
            <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-4 text-sm font-black text-[#9A3412]" href="/dos">
              Save to Follow-Up
            </a>
          </div>

          <p className="px-2 text-center text-xs leading-5 text-[#64748B]">{dosPrayerResourceAttribution}</p>
        </section>
      </article>
    </main>
  );
}

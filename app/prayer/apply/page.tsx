import type { Metadata } from "next";
import { PrimaryNav } from "../../../components/PrimaryNav";
import { PrayerPartnerApplicationForm } from "./PrayerPartnerApplicationForm";

export const metadata: Metadata = {
  title: "Prayer Team Application | USA Missionaries",
  description: "Apply to join the USA Missionaries Prayer Team.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SearchParams = {
  error?: string;
  submitted?: string;
};

export default async function PrayerPartnerApplicationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="prayer" />

      <section className="relative overflow-hidden px-6 pb-10 pt-24 md:pb-12 md:pt-28">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.08),transparent_24%),linear-gradient(180deg,rgba(5,5,5,0.15),#050505_88%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
            Prayer Team
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-bold uppercase leading-[0.92] tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Prayer Team Application
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-stone-400 md:text-lg">
            Approved prayer partners help cover confidential assignments, missionary families, kitchen table meetings, leaders, cities, finances, and other mission needs.
          </p>
        </div>
      </section>

      <section className="border-t border-stone-900/80 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <PrayerPartnerApplicationForm
            error={params.error}
            submitted={params.submitted === "1"}
          />
        </div>
      </section>
    </main>
  );
}

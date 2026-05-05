import type { Metadata } from "next";
import { PrimaryNav } from "../../../components/PrimaryNav";
import { PrayerPartnerApplicationForm } from "../apply/PrayerPartnerApplicationForm";

export const metadata: Metadata = {
  title: "Join the Prayer Team | USA Missionaries",
  description: "Apply to join the USA Missionaries Prayer Team.",
};

type SearchParams = {
  error?: string;
  submitted?: string;
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default async function PrayerTeamJoinPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="prayer" />

      <section className="border-b border-stone-900/80 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
            Prayer Team
          </p>
          <h1 className="mt-6 text-5xl font-bold uppercase leading-none text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Join The Prayer Team
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-400">
            Apply to become an approved USA Missionaries prayer partner. Our team reviews each application before assigning prayer coverage and future alerts.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <PrayerPartnerApplicationForm
            error={params.error}
            submitted={params.submitted === "1"}
          />
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { PrimaryNav } from "../../components/PrimaryNav";
import { MissionaryIntakeForm } from "./MissionaryIntakeForm";

export const metadata: Metadata = {
  title: "Missionary Profile Intake | USA Missionaries",
  description: "Missionary profile intake form for USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function MissionaryIntakePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="support" />

      <div className="w-full bg-[#0A0A0A] py-2.5 text-center text-xs uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Internal Use Only - USAM Missionary Intake
      </div>

      <section className="relative overflow-hidden px-6 pb-16 pt-24 md:pb-20 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(212,166,61,0.12),transparent_28%),radial-gradient(ellipse_at_center,transparent_34%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Missionary Intake
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Missionary Profile Intake
          </h1>
          <p className="mt-4 text-sm uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            This form is intended for invited USAM missionaries only.
          </p>
          <p className="mt-8 max-w-4xl text-base leading-8 text-stone-400 md:text-lg">
            Use this form to help us build your USAM missionary profile page. Your answers will help people understand your story, your calling, your needs, and how they can partner with you.
          </p>
        </div>
      </section>

      <section className="border-t border-stone-900/80 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <MissionaryIntakeForm />
        </div>
      </section>
    </main>
  );
}

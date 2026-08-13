import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { restorationPreviewToken } from "@/src/lib/restoration/intake";

export const metadata: Metadata = {
  title: "Your Path to Freedom | USA Missionaries",
  description: "Ministry of Reconciliation in partnership with USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function RestorationLandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-5 py-8 text-[#15120c] md:px-8 md:py-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">
        <div className="mb-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#7c6b3e]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          Private Invitation
        </div>

        <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b7235]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Ministry of Reconciliation in partnership with USA Missionaries
        </p>
        <h1 className="mt-5 text-5xl font-semibold uppercase leading-[0.95] text-[#15120c] md:text-7xl" style={{ fontFamily: font.oswald }}>
          Your Path to Freedom
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4d4639] md:text-xl md:leading-9">
          Your story matters. You have already taken an important first step by meeting with someone from USA Missionaries. The next step is creating space for Jesus to bring healing, freedom, and reconciliation into the places that have shaped your life.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#C2A14E] px-6 text-sm font-bold uppercase tracking-[0.18em] text-[#15120c] shadow-[0_18px_45px_rgba(122,90,22,0.24)] transition-colors hover:bg-[#d8b65c]"
              href={`/restoration/${restorationPreviewToken}`}
              style={{ fontFamily: font.rajdhani }}
            >
              Begin My Reflection
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#6b604f]">
              View-only preview. Answers are not saved or submitted.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

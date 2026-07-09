import type { Metadata } from "next";
import { PrimaryNav } from "@/components/PrimaryNav";
import { PartnersAccessGateForm } from "./PartnersAccessGateForm";

export const metadata: Metadata = {
  description: "Private partnership and integration resource center for USA Missionaries.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Ministry Network | USA Missionaries",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function PartnersGatePage() {
  return (
    <main className="min-h-screen bg-usam-black text-stone-100">
      <PrimaryNav />

      <div className="relative flex min-h-[calc(100vh-88px)] items-center justify-center overflow-hidden px-6 py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_620px_at_50%_-12%,rgba(194,161,78,0.14),transparent_60%)]" />

        <div className="relative w-full max-w-md border border-stone-800 bg-white/[0.02] px-8 py-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:px-11">
          <p
            className="text-[12px] uppercase tracking-[0.34em] text-usam-gold"
            style={{ fontFamily: font.rajdhani }}
          >
            USA Missionaries
          </p>
          <h1
            className="mt-4 text-3xl font-bold text-stone-100"
            style={{ fontFamily: font.oswald }}
          >
            Ministry Network
          </h1>
          <p className="mt-2 text-sm text-stone-500">Private partnership and integration resource center</p>

          <PartnersAccessGateForm />

          <p className="mt-8 border-t border-stone-800 pt-6 text-xs leading-6 text-stone-500">
            Access is intended for ministry leaders, board members, and advisors exploring partnership with USA
            Missionaries.
          </p>
        </div>
      </div>
    </main>
  );
}

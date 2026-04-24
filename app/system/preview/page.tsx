import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../../components/PrimaryNav";
import { PreviewAccessForm } from "./PreviewAccessForm";

export const metadata: Metadata = {
  title: "Restricted Access | USA Missionaries",
  description: "Restricted access gate for the USA Missionaries discipleship system.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export default function SystemPreviewPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="dos" />

      <section className="relative flex min-h-screen items-center overflow-hidden px-6 pb-16 pt-28 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(245,158,11,0.08),transparent_26%),radial-gradient(circle_at_78%_52%,rgba(245,158,11,0.045),transparent_22%),linear-gradient(180deg,rgba(5,5,5,0.2),#050505_90%)]" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-amber-500/80" style={{ fontFamily: font.rajdhani }}>
              Restricted Access
            </p>
            <h1
              className="mt-6 text-5xl uppercase leading-[0.94] text-stone-100 md:text-7xl"
              style={{ fontFamily: font.oswald }}
            >
              Enter With
              <br />
              <span className="text-amber-400">Access Code</span>
            </h1>
            <p className="mt-6 max-w-lg whitespace-pre-line text-base leading-8 text-stone-300 md:text-lg">
              {`Access to this system is limited.
If you’ve been given an access code, enter it below to proceed.`}
            </p>
          </div>

          <div className="relative border border-stone-800/80 bg-[#070707]/95 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] md:p-8">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.018),rgba(255,255,255,0.018)_1px,transparent_1px,transparent_5px)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.3)]" />
                  <span
                    className="text-[10px] uppercase tracking-[0.28em] text-stone-200"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    PREVIEW GATE
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden text-[10px] uppercase tracking-[0.2em] text-stone-300 sm:inline">
                    Authorized Only
                  </span>
                  <Link
                    href="/system"
                    className="inline-flex h-8 w-8 items-center justify-center border border-stone-600 text-base leading-none text-stone-200 transition-colors hover:border-stone-300 hover:text-stone-100"
                    aria-label="Exit preview access"
                  >
                    ×
                  </Link>
                </div>
              </div>

              <PreviewAccessForm />

              <div className="mt-8 border-t border-stone-900 pt-4">
                <Link
                  href="/system"
                  className="text-[11px] uppercase tracking-[0.22em] text-stone-300 transition-colors hover:text-stone-100"
                  style={{ fontFamily: font.rajdhani }}
                >
                  Return to system layer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

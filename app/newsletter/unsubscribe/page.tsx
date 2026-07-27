import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  description: "Unsubscribe from the USA Missionaries newsletter.",
  robots: { follow: false, index: false },
  title: "Unsubscribe | USA Missionaries",
};

export default function NewsletterUnsubscribeLandingPage() {
  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <section className="px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Newsletter
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
            Use the Link in Your Email
          </h1>
          <div className="mt-8 rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6 md:p-8">
            <p className="text-sm leading-7 text-stone-400">
              For your security, unsubscribing requires the personal link at the bottom of any newsletter email
              you've received — look for "Unsubscribe" in the footer.
            </p>
            <Link
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-usam-gold px-6 text-xs uppercase tracking-[0.2em] text-usam-gold hover:bg-usam-gold/10"
              href="/newsletter"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              Go to Newsletter
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

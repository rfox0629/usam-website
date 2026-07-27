import type { Metadata } from "next";
import { PrimaryNav } from "@/components/PrimaryNav";
import { AdminSubscriberListMockup } from "./AdminSubscriberListMockup";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  description: "Internal UX mockup — illustrative only, not a real admin surface.",
  robots: { follow: false, index: false },
  title: "Admin Subscriber List Mockup | USA Missionaries",
};

export default function NewsletterAdminPreviewPage() {
  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <section className="px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Internal UX Mockup
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
            Subscriber Admin — UX Recommendation
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">
            This is a clickable mockup with entirely fabricated sample rows — it illustrates the recommended
            layout, not a real admin page. USA-47 owns building the actual admin surface (under{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">/admin</code>, inside{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">AdminShell</code>) against real subscriber
            data. See <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">docs/newsletter-presentation-layer.md</code> for
            the full column/action/state spec. This page is <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">noindex</code>.
          </p>

          <div className="mt-8">
            <AdminSubscriberListMockup />
          </div>
        </div>
      </section>
    </main>
  );
}

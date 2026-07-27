import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { NewsletterUnsubscribeCard } from "@/components/newsletter/NewsletterUnsubscribeCard";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  description: "Unsubscribe from the USA Missionaries newsletter.",
  robots: { follow: false, index: false },
  title: "Unsubscribe | USA Missionaries",
};

/** Same design-phase stand-in pattern as the preferences route — see that file's comment. */
function resolveTokenForPreview(token: string) {
  if (token === "invalid" || token === "expired") {
    return { email: null, valid: false as const };
  }

  return { email: "subscriber@example.com", valid: true as const };
}

export default async function NewsletterUnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = resolveTokenForPreview(token);

  return (
    <main className="min-h-screen bg-usam-black">
      <PrimaryNav />

      <section className="px-6 pb-20 pt-28 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-usam-gold" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Newsletter
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
            Unsubscribe
          </h1>

          <div className="mt-8 rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6 md:p-8">
            {resolved.valid ? (
              <NewsletterUnsubscribeCard subscriberEmail={resolved.email} />
            ) : (
              <div role="alert">
                <p className="text-lg font-semibold text-stone-100">This link has expired.</p>
                <p className="mt-2 text-sm leading-7 text-stone-400">
                  Unsubscribe links expire after a period of time for your security. You can also reply to any
                  newsletter email and ask to be removed.
                </p>
                <Link
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-usam-gold px-6 text-xs uppercase tracking-[0.2em] text-usam-gold hover:bg-usam-gold/10"
                  href="/newsletter"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Back to Newsletter
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

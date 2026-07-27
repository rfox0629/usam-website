import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { NewsletterPreferencesForm } from "@/components/newsletter/NewsletterPreferencesForm";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export const metadata: Metadata = {
  description: "Manage which USA Missionaries newsletter updates you receive.",
  robots: { follow: false, index: false },
  title: "Manage Preferences | USA Missionaries",
};

/**
 * Design-phase stand-in for real token validation. USA-47 should resolve
 * `token` against the subscriber table from USA-45 and 404/expire as
 * appropriate; the "invalid" sentinel here only exists so this state has a
 * concrete preview (see /newsletter/preferences/invalid).
 */
function resolveTokenForPreview(token: string) {
  if (token === "invalid" || token === "expired") {
    return { email: null, valid: false as const };
  }

  return { email: "subscriber@example.com", valid: true as const };
}

export default async function NewsletterPreferencesPage({ params }: { params: Promise<{ token: string }> }) {
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
            Manage Your Preferences
          </h1>

          <div className="mt-8 rounded-2xl border border-stone-800/70 bg-white/[0.02] p-6 md:p-8">
            {resolved.valid ? (
              <NewsletterPreferencesForm subscriberEmail={resolved.email} />
            ) : (
              <div role="alert">
                <p className="text-lg font-semibold text-stone-100">This link has expired.</p>
                <p className="mt-2 text-sm leading-7 text-stone-400">
                  Preference links expire after a period of time for your security. Enter your email again from any
                  newsletter footer to get a fresh link, or subscribe again below.
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

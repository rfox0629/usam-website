import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { getSubscriberByPreferenceToken } from "@/src/lib/communications/data";
import { unsubscribeFromNewsletter } from "./actions";

export const metadata: Metadata = {
  title: "Unsubscribe | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type PageParams = {
  token: string;
};

type SearchParams = {
  done?: string;
  error?: string;
};

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const subscriber = await getSubscriberByPreferenceToken(token);

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-stone-950">
      <PrimaryNav active="mission" minimal />

      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-xl border border-stone-200 bg-white p-5 shadow-sm md:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Newsletter
          </p>
          <h1 className="mt-3 text-4xl font-semibold uppercase leading-none text-stone-950" style={{ fontFamily: font.oswald }}>
            Unsubscribe
          </h1>

          {!subscriber ? (
            <>
              <p className="mt-5 text-sm leading-7 text-stone-600">
                This unsubscribe link is no longer valid. Use the link in your most recent
                USA Missionaries email, or reply to that email and we will remove you.
              </p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950" href="/newsletter">
                Read Past Updates
              </Link>
            </>
          ) : query.done === "1" ? (
            <>
              <p className="mt-5 text-sm leading-7 text-stone-600">
                {subscriber.email} has been unsubscribed from USA Missionaries newsletter email.
              </p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-stone-700" href={`/preferences/${token}`}>
                Manage Preferences
              </Link>
            </>
          ) : (
            <form action={unsubscribeFromNewsletter} className="mt-5">
              <input type="hidden" name="token" value={token} />
              <p className="text-sm leading-7 text-stone-600">
                Stop newsletter email for {subscriber.email}. This is safe to submit more than once.
              </p>
              {query.error ? (
                <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  Unsubscribe could not be saved.
                </div>
              ) : null}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-stone-950 px-5 text-sm font-semibold text-white" type="submit">
                  Unsubscribe
                </button>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-stone-700" href={`/preferences/${token}`}>
                  Keep Updates
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

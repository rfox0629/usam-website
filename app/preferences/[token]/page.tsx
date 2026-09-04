import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { communicationTopics } from "@/src/lib/communications/config";
import { getSubscriberByPreferenceToken } from "@/src/lib/communications/data";
import { saveNewsletterPreferences } from "./actions";

export const metadata: Metadata = {
  title: "Newsletter Preferences | USA Missionaries",
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
  error?: string;
  saved?: string;
};

function preferenceEnabled(preferences: Array<{ enabled: boolean; topic: string }>, topic: string) {
  return preferences.find((preference) => preference.topic === topic)?.enabled ?? true;
}

export default async function NewsletterPreferencesPage({
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
        <div className="mx-auto max-w-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-8">
          {!subscriber ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Preferences
              </p>
              <h1 className="mt-3 text-4xl font-semibold uppercase leading-none text-stone-950" style={{ fontFamily: font.oswald }}>
                Link Expired
              </h1>
              <p className="mt-5 text-sm leading-7 text-stone-600">
                This preference link is no longer valid. Use the link in your most recent
                USA Missionaries email, or reply to that email and we will sort it out.
              </p>
              <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950" href="/newsletter">
                Read Past Updates
              </Link>
            </div>
          ) : (
            <form action={saveNewsletterPreferences}>
              <input type="hidden" name="token" value={token} />
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Preferences
              </p>
              <h1 className="mt-3 text-4xl font-semibold uppercase leading-none text-stone-950" style={{ fontFamily: font.oswald }}>
                Email Updates
              </h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {subscriber.email}
              </p>

              {query.saved === "1" ? (
                <div className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Preferences saved.
                </div>
              ) : null}
              {query.error ? (
                <div className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  Preferences could not be saved.
                </div>
              ) : null}

              <div className="mt-6 space-y-2">
                {communicationTopics.map((topic) => (
                  <label key={topic.value} className="flex gap-3 border border-stone-200 bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-700">
                    <input
                      className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]"
                      defaultChecked={preferenceEnabled(subscriber.preferences, topic.value)}
                      name="topics"
                      type="checkbox"
                      value={topic.value}
                    />
                    <span>
                      <span className="block font-semibold text-stone-950">{topic.label}</span>
                      <span className="block text-stone-600">{topic.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950" type="submit">
                  Save Preferences
                </button>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-5 text-sm font-semibold text-stone-700" href={`/unsubscribe/${token}`}>
                  Unsubscribe
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

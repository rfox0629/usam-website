import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import {
  communicationPreferenceTopics,
  defaultPreferenceEnabled,
  loadPreferencePortal,
} from "@/src/lib/communications/newsletter";
import { saveCommunicationPreferences, unsubscribeCommunication } from "../actions";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "Email Preferences | USA Missionaries",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SearchParams = {
  error?: string;
  saved?: string;
  unsubscribed?: string;
};

function pageMessage(params: SearchParams) {
  if (params.saved === "1") {
    return {
      text: "Preferences saved.",
      tone: "green" as const,
    };
  }

  if (params.unsubscribed === "1") {
    return {
      text: "You have been unsubscribed.",
      tone: "green" as const,
    };
  }

  if (params.error) {
    return {
      text: decodeURIComponent(params.error),
      tone: "red" as const,
    };
  }

  return null;
}

function Message({ text, tone }: { text: string; tone: "green" | "red" }) {
  const className = tone === "green"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-red-200 bg-red-50 text-red-800";

  return <div className={`mb-5 border p-4 text-sm leading-7 ${className}`}>{text}</div>;
}

function InvalidState({ detail }: { detail: string }) {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />
      <section className="px-6 py-28">
        <div className="mx-auto max-w-xl border border-stone-800 bg-[#080808] p-6 md:p-8">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Email Preferences
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-none tracking-normal text-stone-100" style={{ fontFamily: font.oswald }}>
            Link unavailable
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-400">{detail}</p>
          <Link className="mt-6 inline-flex text-sm font-semibold text-[#C2A14E] hover:text-stone-100" href="/preferences">
            Request a new link
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function PreferenceTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ token }, currentSearchParams] = await Promise.all([params, searchParams]);
  const portal = await loadPreferencePortal(token);

  if (portal.error || !portal.subscriber) {
    return <InvalidState detail={portal.error ?? "This preferences link is not available."} />;
  }

  const message = pageMessage(currentSearchParams);

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />

      <section className="px-6 pb-12 pt-24 md:pt-28">
        <div className="mx-auto max-w-3xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Email Preferences
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-none tracking-normal text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Choose updates
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-400 md:text-lg">
            Signed in for {portal.subscriber.email}.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-12 text-stone-950 md:py-16">
        <div className="mx-auto max-w-3xl border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-7">
          {message ? <Message text={message.text} tone={message.tone} /> : null}

          <form action={saveCommunicationPreferences}>
            <input name="token" type="hidden" value={token} />
            <div className="grid gap-3">
              {communicationPreferenceTopics.map((topic) => (
                <label key={topic.value} className="flex gap-3 border border-stone-200 bg-[#fbfaf7] p-4 text-sm leading-7 text-stone-700">
                  <input
                    className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]"
                    defaultChecked={defaultPreferenceEnabled(portal.preferences, topic.value)}
                    name={topic.value}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold text-stone-950">{topic.label}</span>
                    <span className="block text-stone-600">{topic.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex min-h-12 items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C]"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="submit"
              >
                Save Preferences
              </button>
            </div>
          </form>

          <form action={unsubscribeCommunication} className="mt-6 border-t border-stone-200 pt-5">
            <input name="token" type="hidden" value={token} />
            <button
              className="inline-flex min-h-11 items-center justify-center border border-stone-300 px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-stone-700 transition-colors hover:border-red-400 hover:text-red-700"
              name="redirect_to"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="submit"
              value="preferences"
            >
              Unsubscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

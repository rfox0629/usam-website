import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { requestPreferenceLink } from "./actions";

export const metadata: Metadata = {
  description: "Request a secure USA Missionaries email preference link.",
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
  requested?: string;
};

function messageFromError(value?: string) {
  if (!value) {
    return null;
  }

  if (value === "missing") {
    return "Enter the email address you used to subscribe.";
  }

  return decodeURIComponent(value);
}

export default async function PreferencesRequestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = messageFromError(params.error);

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />

      <section className="px-6 pb-12 pt-24 md:pt-28">
        <div className="mx-auto max-w-3xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Email Preferences
          </p>
          <h1 className="mt-5 text-5xl font-bold leading-none tracking-normal text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Manage updates
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-400 md:text-lg">
            Enter your email and we will send a secure preference link if the address is subscribed.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-12 text-stone-950 md:py-16">
        <div className="mx-auto max-w-3xl border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-7">
          {params.requested === "1" ? (
            <div className="mb-5 border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
              If that address is subscribed, a secure link will be sent when Phase 1 email sending allows it.
            </div>
          ) : null}
          {error ? (
            <div className="mb-5 border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">
              {error}
            </div>
          ) : null}

          <form action={requestPreferenceLink}>
            <label className="text-[11px] uppercase tracking-[0.16em] text-stone-700" htmlFor="email" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Email
            </label>
            <input
              autoComplete="email"
              className="mt-2 min-h-12 w-full border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-[#C2A14E] md:text-sm"
              id="email"
              name="email"
              required
              type="email"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="inline-flex min-h-12 items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C]"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="submit"
              >
                Send Link
              </button>
              <Link className="text-sm font-semibold text-[#80600f] hover:text-stone-950" href="/subscribe">
                Subscribe instead
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

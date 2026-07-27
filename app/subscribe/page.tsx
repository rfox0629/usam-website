import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { submitNewsletterSubscribe } from "./actions";

export const metadata: Metadata = {
  description: "Subscribe to USA Missionaries field updates.",
  title: "Subscribe | USA Missionaries",
};

export const dynamic = "force-dynamic";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SearchParams = {
  error?: string;
  subscribed?: string;
};

function inputClassName() {
  return "mt-2 min-h-12 w-full border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition-colors placeholder:text-stone-400 focus:border-[#C2A14E] md:text-sm";
}

function errorMessage(value?: string) {
  if (!value) {
    return null;
  }

  if (value === "missing") {
    return "Add your email and confirm consent before subscribing.";
  }

  return decodeURIComponent(value);
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = errorMessage(params.error);

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-stone-100">
      <PrimaryNav active="support" />

      <section className="relative overflow-hidden px-6 pb-12 pt-24 md:pt-28">
        <div className="absolute inset-0">
          <img
            alt=""
            className="h-full w-full object-cover opacity-28"
            src="/missionary-mountain-background.jpg"
          />
          <div className="absolute inset-0 bg-[#0D0D0D]/75" />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            Field Updates
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-none tracking-normal text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Stay connected to the mission
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-300 md:text-lg">
            Receive occasional public updates from USA Missionaries.
          </p>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-12 text-stone-950 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <form action={submitNewsletterSubscribe} className="border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-7">
            {params.subscribed === "1" ? (
              <div className="mb-5 border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                You are subscribed. You can manage preferences from the secure link included in newsletter emails.
              </div>
            ) : null}
            {error ? (
              <div className="mb-5 border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800">
                {error}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-[11px] uppercase tracking-[0.16em] text-stone-700" htmlFor="first_name" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  First Name
                </label>
                <input className={inputClassName()} id="first_name" name="first_name" autoComplete="given-name" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.16em] text-stone-700" htmlFor="last_name" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Last Name
                </label>
                <input className={inputClassName()} id="last_name" name="last_name" autoComplete="family-name" />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-[11px] uppercase tracking-[0.16em] text-stone-700" htmlFor="email" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Email
              </label>
              <input className={inputClassName()} id="email" name="email" type="email" autoComplete="email" required />
            </div>

            <label className="mt-5 flex gap-3 border border-stone-200 bg-[#fbfaf7] p-4 text-sm leading-7 text-stone-700">
              <input className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]" name="consent" type="checkbox" required />
              <span>
                I agree to receive USA Missionaries email updates. I can unsubscribe or update preferences from secure newsletter links.
              </span>
            </label>

            <button
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center bg-[#C2A14E] px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#DAB95C] sm:w-auto"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              Subscribe
            </button>
          </form>

          <aside className="border border-stone-200 bg-white p-5 text-sm leading-7 text-stone-700 shadow-[0_24px_80px_rgba(13,13,13,0.08)] md:p-7">
            <h2 className="text-2xl font-bold leading-tight text-stone-950" style={{ fontFamily: font.oswald }}>
              Your information stays private.
            </h2>
            <p className="mt-4">
              We use your email only for USA Missionaries updates and related preference management.
            </p>
            <Link className="mt-5 inline-flex text-sm font-semibold text-[#80600f] hover:text-stone-950" href="/preferences">
              Request a preference link
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

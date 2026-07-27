import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "@/components/PrimaryNav";
import { communicationTopics } from "@/src/lib/communications/config";
import { subscribeToNewsletter } from "./actions";

export const metadata: Metadata = {
  title: "Subscribe | USA Missionaries",
  description: "Subscribe to USA Missionaries field updates.",
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const errorMessages: Record<string, string> = {
  config: "The subscription system is not configured yet.",
  email: "Please enter a valid email address.",
  submit: "Your subscription could not be saved. Please try again.",
  topics: "Choose at least one update type.",
};

type SearchParams = {
  error?: string;
  submitted?: string;
};

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-md border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15";
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] ?? errorMessages.submit : null;
  const submitted = params.submitted === "1";

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-stone-950">
      <PrimaryNav active="mission" />

      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Newsletter
            </p>
            <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.95] text-stone-950 md:text-6xl" style={{ fontFamily: font.oswald }}>
              Field Updates
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-700 md:text-lg">
              Receive concise updates from USA Missionaries. You can change topics or unsubscribe from any newsletter preference link.
            </p>
            <Link className="mt-7 inline-flex text-sm font-semibold text-[#7a5a12] underline-offset-4 hover:underline" href="/newsletter">
              View the archive
            </Link>
          </div>

          <div className="border border-stone-200 bg-white p-5 shadow-sm md:p-7">
            {submitted ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6a1f]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Saved
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-stone-950">You are subscribed</h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  Your preferences were saved. Phase 1 newsletter sends are still limited while the system is being validated.
                </p>
              </div>
            ) : (
              <form action={subscribeToNewsletter} className="space-y-5">
                {error ? (
                  <div className="border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-xs uppercase tracking-[0.14em] text-stone-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    First Name
                    <input className={fieldClassName()} name="first_name" autoComplete="given-name" />
                  </label>
                  <label className="block text-xs uppercase tracking-[0.14em] text-stone-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Last Name
                    <input className={fieldClassName()} name="last_name" autoComplete="family-name" />
                  </label>
                </div>

                <label className="block text-xs uppercase tracking-[0.14em] text-stone-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Email
                  <input className={fieldClassName()} name="email" type="email" autoComplete="email" required />
                </label>

                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-stone-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Updates
                  </p>
                  <div className="mt-3 space-y-2">
                    {communicationTopics.map((topic) => (
                      <label key={topic.value} className="flex gap-3 border border-stone-200 bg-[#fbfaf7] p-4 text-sm leading-6 text-stone-700">
                        <input className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]" defaultChecked name="topics" type="checkbox" value={topic.value} />
                        <span>
                          <span className="block font-semibold text-stone-950">{topic.label}</span>
                          <span className="block text-stone-600">{topic.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <p className="text-xs leading-6 text-stone-500">
                  We use your email only for USA Missionaries updates and preference management. No payment or sensitive information is requested here.
                </p>

                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C2A14E] px-5 text-sm font-semibold text-stone-950 transition-colors hover:bg-[#d6b85f]"
                  type="submit"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

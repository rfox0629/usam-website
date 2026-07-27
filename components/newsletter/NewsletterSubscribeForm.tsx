"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type SubscribeStatus = "duplicate" | "error" | "idle" | "submitting" | "success";

/**
 * Presentation-only subscribe form (USA-46). `onSubscribe` is a stub —
 * USA-47 should replace it with a real call to the Resend/subscriber
 * endpoint once USA-45's data model lands. Left as a prop (rather than a
 * hardcoded fetch) so this component doesn't reach into any API route.
 */
async function defaultSubscribeStub(_email: string): Promise<{ status: "duplicate" | "success" }> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { status: "success" };
}

export function NewsletterSubscribeForm({
  description = "One thoughtful email a month — field stories, prayer needs, and what God is doing at the table.",
  onSubscribe = defaultSubscribeStub,
  title = "Get the Newsletter",
}: {
  description?: string;
  onSubscribe?: (email: string) => Promise<{ status: "duplicate" | "success" }>;
  title?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "submitting") {
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const result = await onSubscribe(email);
      setStatus(result.status);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-usam-success/25 bg-usam-success/10 p-5 text-sm leading-7 text-usam-success" role="status">
        <p className="font-semibold">You're subscribed.</p>
        <p className="mt-1">Check your inbox for a confirmation email — the next issue lands in your inbox soon.</p>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="rounded-2xl border border-usam-gold/40 bg-usam-gold/10 p-5 text-sm leading-7 text-stone-100" role="status">
        <p className="font-semibold">You're already on the list.</p>
        <p className="mt-1 text-stone-400">
          Want to change how often you hear from us? <a className="underline decoration-usam-gold/60 underline-offset-2 hover:text-usam-gold" href="/newsletter/preferences">Manage your preferences</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} noValidate>
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-usam-gold" style={{ fontFamily: font.rajdhani }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-400">{description}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="newsletter-subscribe-email">Email address</label>
        <input
          autoComplete="email"
          className="min-h-12 w-full flex-1 rounded-xl border border-stone-700 bg-[#0D0D0D] px-4 text-sm text-stone-100 shadow-sm outline-none transition placeholder:text-stone-500 focus:border-usam-gold focus:ring-4 focus:ring-usam-gold/15"
          id="newsletter-subscribe-email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
        <button
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-usam-gold bg-usam-gold px-6 text-xs uppercase leading-5 tracking-[0.2em] text-usam-black shadow-sm transition-all duration-300 hover:bg-usam-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "submitting"}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="submit"
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      {status === "error" ? (
        <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-xs leading-6 text-red-300" role="alert">
          {errorMessage || "Something went wrong. Please try again."}
        </p>
      ) : (
        <p className="mt-3 text-xs leading-5 text-stone-500">
          No spam. Unsubscribe anytime from any issue.
        </p>
      )}
    </form>
  );
}

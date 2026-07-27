"use client";

import { useState } from "react";
import Link from "next/link";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type UnsubscribeStatus = "confirming" | "done" | "error" | "processing";

/**
 * Presentation-only unsubscribe flow (USA-46). `onUnsubscribe` is a stub for
 * USA-47 to wire against the real token/subscriber model from USA-45.
 */
async function defaultUnsubscribeStub(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
}

export function NewsletterUnsubscribeCard({
  onUnsubscribe = defaultUnsubscribeStub,
  subscriberEmail,
}: {
  onUnsubscribe?: () => Promise<void>;
  subscriberEmail: string;
}) {
  const [status, setStatus] = useState<UnsubscribeStatus>("confirming");

  async function handleConfirm() {
    setStatus("processing");

    try {
      await onUnsubscribe();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div role="status">
        <p className="text-lg font-semibold text-stone-100">You've been unsubscribed.</p>
        <p className="mt-2 text-sm leading-7 text-stone-400">
          {subscriberEmail} will no longer receive the USA Missionaries newsletter. Changed your mind?
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-usam-gold px-6 text-xs uppercase tracking-[0.2em] text-usam-gold hover:bg-usam-gold/10"
          href="/newsletter"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Resubscribe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg font-semibold text-stone-100">Unsubscribe {subscriberEmail}?</p>
      <p className="mt-2 text-sm leading-7 text-stone-400">
        You'll stop receiving the USA Missionaries newsletter. If you'd rather hear less often instead of not at
        all, you can adjust your topics and frequency instead.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/60 bg-red-950/40 px-6 text-xs uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "processing"}
          onClick={handleConfirm}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          {status === "processing" ? "Unsubscribing…" : "Yes, Unsubscribe Me"}
        </button>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-usam-gold/65 px-6 text-xs uppercase tracking-[0.2em] text-usam-white transition-colors hover:border-usam-gold hover:bg-usam-gold/12"
          href="/newsletter/preferences"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Adjust Preferences Instead
        </Link>
      </div>

      {status === "error" ? (
        <p className="mt-4 text-sm text-red-400" role="alert">Couldn't process that — please try again.</p>
      ) : null}
    </div>
  );
}

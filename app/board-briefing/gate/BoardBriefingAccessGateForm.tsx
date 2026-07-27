"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function BoardBriefingAccessGateForm() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = accessCode.trim();

    if (!trimmedCode) {
      setError("Please enter your access code.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/board-briefing-access", {
        body: JSON.stringify({ accessCode: trimmedCode }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "That access code wasn't recognized.");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "That access code wasn't recognized.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="text-left">
        <label
          className="tactical-label block uppercase"
          htmlFor="board-briefing-access-code"
          style={{ fontFamily: font.rajdhani }}
        >
          Access Code
        </label>
        <input
          autoComplete="one-time-code"
          className="mt-2 w-full rounded-sm border border-stone-700 bg-black/40 px-4 py-3 text-base text-white outline-none transition placeholder:text-stone-600 focus:border-usam-gold"
          id="board-briefing-access-code"
          name="accessCode"
          onChange={(event) => setAccessCode(event.target.value)}
          placeholder="Enter your access code"
          type="password"
          value={accessCode}
        />
      </div>

      {error ? <p className="text-left text-sm text-red-400">{error}</p> : null}

      <button
        className="inline-flex w-full items-center justify-center border border-usam-gold bg-usam-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-usam-black transition-colors hover:bg-usam-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        style={{ fontFamily: font.rajdhani }}
        type="submit"
      >
        {isSubmitting ? "Checking..." : "Enter"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

/**
 * USA-167: the access screen shown while JOIN_PREVIEW_ACCESS_KEY is set.
 *
 * Deliberately says nothing about DOS, and nothing about who has been invited.
 * It is the first thing an unauthorized visitor sees at a URL that will later
 * be public, so it stays plain.
 */
export function JoinPreviewGate({ configured = true }: { configured?: boolean }) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = accessCode.trim();

    if (!trimmed) {
      setError("Please enter your access code.");

      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/join-preview-access", {
        body: JSON.stringify({ accessCode: trimmed }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "That access code was not recognized.");
      }

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "That access code was not recognized.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FBFF] px-4 py-16 text-[#0F172A]">
      <div className="w-full max-w-md rounded-[28px] border border-[#DCEBFF] bg-white p-8 text-center shadow-[0_22px_62px_rgba(37,99,235,0.10)]">
        <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#2563EB]">USA Missionaries</p>
        <h1 className="mt-3 text-2xl font-black leading-tight text-[#020617]">This application is in review</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          The USA Missionaries application is not open to the public yet. If you were given an access code, enter it
          below.
        </p>

        {configured ? null : (
          <p className="mt-5 rounded-2xl border border-[#FBD5B5] bg-[#FFF7ED] px-4 py-3 text-sm leading-6 text-[#9A3412]">
            This preview has no access key configured, so the application is closed. Set JOIN_PREVIEW_ACCESS_KEY on the
            deployment to open it for review.
          </p>
        )}

        <form className="mt-7 text-left" onSubmit={handleSubmit}>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-[#475569]" htmlFor="join-access-code">
            Access code
          </label>
          <input
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-2xl border border-[#DCEBFF] bg-white px-4 text-base text-[#0F172A] outline-none focus:border-[#2563EB]"
            id="join-access-code"
            onChange={(event) => setAccessCode(event.target.value)}
            type="password"
            value={accessCode}
          />

          {error ? <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p> : null}

          <button
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

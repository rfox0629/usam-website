"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function AdvisorAccessGateForm() {
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
      const response = await fetch("/api/advisor-access", {
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
          className="block text-[12px] font-medium text-[#5A6473]"
          htmlFor="advisor-access-code"
          style={{ fontFamily: font.rajdhani }}
        >
          Access Code
        </label>
        <input
          autoComplete="one-time-code"
          className="mt-1.5 w-full rounded-sm border border-[#D7DBE4] bg-white px-3.5 py-2.5 text-[15px] text-[#0B1220] outline-none transition placeholder:text-[#8A93A3] focus:border-[#2251E8]"
          id="advisor-access-code"
          name="accessCode"
          onChange={(event) => setAccessCode(event.target.value)}
          placeholder="Enter your access code"
          type="password"
          value={accessCode}
        />
      </div>

      {error ? <p className="text-left text-[13.5px] text-[#B42318]">{error}</p> : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-sm bg-[#0B1220] px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1B2436] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        style={{ fontFamily: font.rajdhani }}
        type="submit"
      >
        {isSubmitting ? "Checking..." : "Enter"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function PreviewAccessForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/system-preview", {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid access code");
      }

      router.push("/system#system-preview");
    } catch {
      setError("Access code not recognized. Check your invitation and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="system-preview-code"
          className="text-[11px] uppercase tracking-[0.24em] text-stone-500"
          style={{ fontFamily: font.rajdhani }}
        >
          Access Code
        </label>
        <input
          id="system-preview-code"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          placeholder="ACCESS CODE"
          className="mt-2 w-full border border-stone-800 bg-[#050505] px-4 py-4 text-sm uppercase tracking-[0.18em] text-stone-100 outline-none transition-colors placeholder:text-stone-700 focus:border-amber-500/60"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center bg-amber-400 px-7 py-3 text-xs uppercase tracking-[0.24em] text-stone-950 transition-all duration-300 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        {isSubmitting ? "Checking..." : "Enter Preview"}
      </button>

      {error && <p className="text-sm leading-6 text-amber-500/80">{error}</p>}
    </form>
  );
}

"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { DosReviewLinkState } from "@/src/lib/dos/review-types";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type ReadyLink = Extract<DosReviewLinkState, { status: "ready" }>;

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function fieldClass() {
  return "mt-2 min-h-12 w-full rounded-2xl border border-[#DDD9D0] bg-[#F8F7F3] px-4 text-sm text-[#1E1D1A] outline-none transition-colors placeholder:text-[#A9A29A] focus:border-[#111111]";
}

export function TestimonyForm({ link }: { link: ReadyLink }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissionToShare, setPermissionToShare] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/dos/testimonies/${link.token}`, {
        body: JSON.stringify({
          decisionMade: String(formData.get("decision_made") ?? ""),
          nextStep: String(formData.get("next_step") ?? ""),
          permissionToShare,
          publicDisplayName: String(formData.get("public_display_name") ?? ""),
          story: String(formData.get("story") ?? ""),
          whatChanged: String(formData.get("what_changed") ?? ""),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to send testimony.");
      }

      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send testimony.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#EDEAE3] px-5 py-10 text-[#1E1D1A]">
        <section className="mx-auto max-w-md rounded-[28px] border border-[#DED9CF] bg-[#F5F3EE] p-5 text-center shadow-[0_24px_70px_rgba(42,37,29,0.10)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
            Share Your Story
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
            Thank you for sharing.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77716A]">Your story has been received.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EDEAE3] px-4 py-6 text-[#1E1D1A]">
      <form className="mx-auto max-w-md rounded-[30px] border border-[#DED9CF] bg-[#F5F3EE] p-4 shadow-[0_24px_70px_rgba(42,37,29,0.10)]" onSubmit={handleSubmit}>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8E8880]" style={{ fontFamily: font.rajdhani }}>
          Share Your Story
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-none text-[#111111]" style={{ fontFamily: font.oswald }}>
          What changed?
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#77716A]">{link.workspaceDisplayName}</p>

        <div className="mt-5 grid gap-3">
          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>Your Story</FieldLabel>
            <textarea className={`${fieldClass()} min-h-32 py-3`} name="story" placeholder="Share what happened in your own words." required />
          </label>
          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>What Changed</FieldLabel>
            <textarea className={`${fieldClass()} min-h-24 py-3`} name="what_changed" placeholder="What feels different now?" />
          </label>
          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>Decision Made</FieldLabel>
            <input className={fieldClass()} name="decision_made" placeholder="Optional" />
          </label>
          <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <FieldLabel>Next Step</FieldLabel>
            <input className={fieldClass()} name="next_step" placeholder="Optional" />
          </label>
          <label className="flex items-start gap-3 rounded-[20px] border border-[#E2DED6] bg-white p-3">
            <input checked={permissionToShare} className="mt-1 h-4 w-4 accent-[#D4A63D]" onChange={(event) => setPermissionToShare(event.target.checked)} type="checkbox" />
            <span>
              <span className="block text-sm font-semibold text-[#1E1D1A]">Permission to share</span>
              <span className="mt-1 block text-xs leading-5 text-[#77716A]">Your story will be reviewed before any public use.</span>
            </span>
          </label>
          {permissionToShare ? (
            <label className="block rounded-[20px] border border-[#E2DED6] bg-white p-3">
              <FieldLabel>Public Display Name</FieldLabel>
              <input className={fieldClass()} name="public_display_name" placeholder="First name, initials, or anonymous" />
            </label>
          ) : null}
        </div>

        {errorMessage ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
        <button className="mt-5 min-h-12 w-full rounded-full bg-[#111111] px-4 text-sm font-bold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send Testimony"}
        </button>
      </form>
    </main>
  );
}

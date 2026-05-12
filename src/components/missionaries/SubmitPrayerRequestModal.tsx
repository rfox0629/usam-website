"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const categoryOptions = ["Healing", "Family", "Financial", "Salvation", "Guidance", "Other"] as const;
const urgencyOptions = [
  { label: "Normal", value: "normal" },
  { label: "Urgent", value: "urgent" },
] as const;

type PrayerCategory = typeof categoryOptions[number];
type PrayerUrgency = typeof urgencyOptions[number]["value"];

type PrayerRequestResponse = {
  error?: string;
  saved?: boolean;
};

type SubmitPrayerRequestModalProps = {
  buttonClassName?: string;
  householdId: string;
  householdName: string;
  profileSlug: string;
};

function compactButtonClassName(customClassName?: string) {
  if (customClassName) {
    return customClassName;
  }

  return "inline-flex min-h-10 items-center justify-center border border-stone-700 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-stone-200 transition-colors hover:border-[#D4A63D]/70 hover:text-[#F5B942]";
}

function inputClassName() {
  return "mt-2 min-h-11 w-full rounded-xl border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
}

function labelClassName() {
  return "text-[10px] uppercase tracking-[0.18em] text-stone-400";
}

export function SubmitPrayerRequestModal({
  buttonClassName,
  householdId,
  householdName,
  profileSlug,
}: SubmitPrayerRequestModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"error" | "idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState<{
    category: PrayerCategory;
    email: string;
    name: string;
    prayerRequest: string;
    urgency: PrayerUrgency;
  }>({
    category: "Guidance",
    email: "",
    name: "",
    prayerRequest: "",
    urgency: "normal",
  });

  function closeModal() {
    if (status === "submitting") {
      return;
    }

    setIsOpen(false);
    setError("");
    setStatus("idle");
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const response = await fetch("/api/prayer-requests", {
      body: JSON.stringify({
        category: formValues.category,
        email: formValues.email,
        householdId,
        householdName,
        name: formValues.name,
        prayerRequest: formValues.prayerRequest,
        profileSlug,
        urgency: formValues.urgency,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as PrayerRequestResponse;

    if (!response.ok || !result.saved) {
      setError(result.error ?? "Unable to send this prayer request right now.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  return (
    <>
      <button
        className={compactButtonClassName(buttonClassName)}
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        Submit Prayer Request
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/78 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-xl items-center">
            <div className="w-full rounded-[1.35rem] border border-stone-800 bg-[#090909] p-5 text-stone-100 shadow-[0_24px_90px_rgba(0,0,0,0.45)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Prayer
                  </p>
                  <h3 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                    {status === "success" ? "Request Received" : "Submit Prayer Request"}
                  </h3>
                  {status !== "success" ? (
                    <p className="mt-3 text-sm leading-6 text-stone-400">
                      Share a prayer request with this missionary household.
                    </p>
                  ) : null}
                </div>
                <button
                  aria-label="Close prayer request"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-white/[0.03] text-sm font-semibold text-stone-300 transition-colors hover:border-[#D4A63D]/70 hover:text-[#F5B942]"
                  onClick={closeModal}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  ×
                </button>
              </div>

              {status === "success" ? (
                <div className="mt-6 rounded-2xl border border-[#D4A63D]/25 bg-[#D4A63D]/10 p-4">
                  <p className="text-base font-semibold text-stone-100">
                    Your prayer request has been received.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    We will be praying with you.
                  </p>
                  <button
                    className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#D4A63D]/45 bg-[#D4A63D] px-4 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942]"
                    onClick={closeModal}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form className="mt-5 space-y-4" onSubmit={submitForm}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClassName()} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Name optional
                      </span>
                      <input
                        autoComplete="name"
                        className={inputClassName()}
                        onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                        value={formValues.name}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClassName()} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Email optional
                      </span>
                      <input
                        autoComplete="email"
                        className={inputClassName()}
                        onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                        type="email"
                        value={formValues.email}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClassName()} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Prayer Request
                    </span>
                    <textarea
                      className="mt-2 min-h-32 w-full rounded-xl border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
                      onChange={(event) => setFormValues((current) => ({ ...current, prayerRequest: event.target.value }))}
                      required
                      value={formValues.prayerRequest}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClassName()} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Category
                      </span>
                      <select
                        className={inputClassName()}
                        onChange={(event) => setFormValues((current) => ({ ...current, category: event.target.value as PrayerCategory }))}
                        value={formValues.category}
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClassName()} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Urgency
                      </span>
                      <select
                        className={inputClassName()}
                        onChange={(event) => setFormValues((current) => ({ ...current, urgency: event.target.value as PrayerUrgency }))}
                        value={formValues.urgency}
                      >
                        {urgencyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {error ? (
                    <p className="rounded-xl border border-red-500/30 bg-red-950/25 p-3 text-sm leading-6 text-red-100">
                      {error}
                    </p>
                  ) : null}

                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-transparent bg-[#D4A63D] px-5 text-[11px] uppercase tracking-[0.2em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={status === "submitting"}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="submit"
                  >
                    {status === "submitting" ? "Submitting" : "Submit Prayer Request"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

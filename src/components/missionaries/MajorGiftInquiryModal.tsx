"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const donationTypeOptions = [
  "Cash",
  "Stock",
  "Crypto",
  "Business interest",
  "Real estate",
  "Vehicle or equipment",
  "Donor-advised fund",
  "Bequest or estate gift",
  "Other noncash asset",
] as const;

const projectedAmountOptions = [
  "Under $1,000",
  "$1,000 to $5,000",
  "$5,000 to $25,000",
  "$25,000 to $100,000",
  "$100,000+",
  "Unsure",
] as const;

const intendedForOptions = [
  "This missionary household",
  "USA Missionaries General Fund",
  "State or regional leadership",
  "National expansion",
  "I'm not sure",
] as const;

type MajorGiftInquiryModalProps = {
  buttonLabel?: string;
  description?: string | null;
  householdId: string;
  householdName: string;
  profileSlug: string;
};

type MajorGiftResponse = {
  error?: string;
};

function subtleButtonClassName() {
  return "inline-flex min-h-12 w-full items-center justify-center border border-white/[0.22] bg-white/[0.02] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-stone-100 transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] hover:text-[#F5B942] sm:w-auto";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

export function MajorGiftInquiryModal({
  buttonLabel = "Contact About Major Gift",
  description,
  householdId,
  householdName,
  profileSlug,
}: MajorGiftInquiryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"error" | "idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [donationTypes, setDonationTypes] = useState<string[]>([]);
  const [consentToContact, setConsentToContact] = useState(false);

  function toggleDonationType(value: string) {
    setDonationTypes((currentTypes) => (
      currentTypes.includes(value)
        ? currentTypes.filter((currentType) => currentType !== value)
        : [...currentTypes, value]
    ));
  }

  function closeModal() {
    if (status === "submitting") {
      return;
    }

    setIsOpen(false);
    setStatus("idle");
    setError("");
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setStatus("submitting");
    setError("");

    const response = await fetch("/api/major-gift-inquiries", {
      body: JSON.stringify({
        bestTimeToContact: String(formData.get("bestTimeToContact") ?? ""),
        consentToContact,
        donationTypes,
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        householdId,
        intendedFor: String(formData.get("intendedFor") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        message: String(formData.get("message") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        profileSlug,
        projectedAmountRange: String(formData.get("projectedAmountRange") ?? ""),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as MajorGiftResponse;

    if (!response.ok) {
      setError(result.error ?? "Unable to submit this inquiry right now.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  return (
    <>
      <button
        className={subtleButtonClassName()}
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-stone-700 bg-[#090909] p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {householdName}
                </p>
                <h3 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                  Contact About a Major Gift
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
                  {description || "Tell us a little about the gift you are considering and someone from USA Missionaries will follow up with you."}
                </p>
              </div>
              <button
                aria-label="Close major gift inquiry"
                className="border border-stone-700 px-3 py-2 text-xs uppercase tracking-[0.18em] text-stone-300 hover:border-[#D4A63D] hover:text-[#F5B942]"
                onClick={closeModal}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Close
              </button>
            </div>

            {status === "success" ? (
              <div className="mt-6 border border-[#D4A63D]/30 bg-[#D4A63D]/10 p-5 text-sm leading-7 text-stone-100">
                Thank you. Your inquiry has been received, and someone from USA Missionaries will follow up with you.
              </div>
            ) : (
              <form className="mt-6 space-y-5" onSubmit={submitInquiry}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <FieldLabel>First Name</FieldLabel>
                    <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="firstName" required />
                  </label>
                  <label className="block">
                    <FieldLabel>Last Name</FieldLabel>
                    <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="lastName" required />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Email</FieldLabel>
                    <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="email" required type="email" />
                  </label>
                  <label className="block">
                    <FieldLabel>Phone</FieldLabel>
                    <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="phone" type="tel" />
                  </label>
                </div>

                <fieldset>
                  <legend className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Donation Type
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {donationTypeOptions.map((option) => (
                      <label
                        className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 text-sm transition-colors ${
                          donationTypes.includes(option)
                            ? "border-[#D4A63D]/50 bg-[#D4A63D]/10 text-stone-100"
                            : "border-stone-800 bg-[#050505] text-stone-300"
                        }`}
                        key={option}
                      >
                        <input
                          checked={donationTypes.includes(option)}
                          className="h-4 w-4 accent-[#D4A63D]"
                          onChange={() => toggleDonationType(option)}
                          type="checkbox"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Projected Donation Amount</FieldLabel>
                    <select className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="projectedAmountRange" required>
                      <option value="">Select range</option>
                      {projectedAmountOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <FieldLabel>Gift Intended For</FieldLabel>
                    <select className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="intendedFor" required>
                      <option value="">Select use</option>
                      {intendedForOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <FieldLabel>Message / Notes</FieldLabel>
                  <textarea className="mt-2 min-h-28 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none focus:border-[#D4A63D]" name="message" />
                </label>
                <label className="block">
                  <FieldLabel>Best Time To Contact</FieldLabel>
                  <input className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none focus:border-[#D4A63D]" name="bestTimeToContact" />
                </label>
                <label className="flex items-start gap-3 text-sm leading-6 text-stone-300">
                  <input
                    checked={consentToContact}
                    className="mt-1 h-4 w-4 accent-[#D4A63D]"
                    onChange={(event) => setConsentToContact(event.target.checked)}
                    required
                    type="checkbox"
                  />
                  I agree to be contacted by USA Missionaries about this gift.
                </label>
                {error ? (
                  <p className="border border-red-500/30 bg-red-950/20 p-3 text-sm leading-6 text-red-100">
                    {error}
                  </p>
                ) : null}
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] sm:w-auto"
                  disabled={status === "submitting"}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  {status === "submitting" ? "Submitting" : "Submit Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  PublicFieldLabel,
  PublicFormGrid,
  PublicFormHeader,
  PublicFormMessage,
  PublicFormSection,
  PublicFormShell,
  PublicSelect,
  PublicSubmitButton,
  PublicTextarea,
  PublicTextInput,
} from "@/components/forms/PublicForm";

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
  initialOpen?: boolean;
  profileSlug: string;
};

type MajorGiftResponse = {
  error?: string;
};

function subtleButtonClassName() {
  return "inline-flex min-h-12 w-full items-center justify-center border border-white/[0.22] bg-white/[0.02] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-stone-100 transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] hover:text-[#F5B942] sm:w-auto";
}

export function MajorGiftInquiryModal({
  buttonLabel = "Contact About Major Gift",
  description,
  householdId,
  householdName,
  initialOpen = false,
  profileSlug,
}: MajorGiftInquiryModalProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
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

  useEffect(() => {
    if (initialOpen) {
      setIsOpen(true);
    }
  }, [initialOpen]);

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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm md:py-14">
          <div className="relative w-full">
            <PublicFormShell size="wide">
              <button
                aria-label="Close major gift inquiry"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={closeModal}
                type="button"
              >
                &times;
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow={householdName}
                  title="Contact About a Major Gift"
                  description={description || "Tell us a little about the gift you are considering and someone from USA Missionaries will follow up with you."}
                  note="This form starts a conversation only. No payment is processed here."
                />

            {status === "success" ? (
              <PublicFormMessage>
                Thank you. Your inquiry has been received, and someone from USA Missionaries will follow up with you.
              </PublicFormMessage>
            ) : (
              <form className="space-y-4" onSubmit={submitInquiry}>
                <PublicFormSection title="Contact Information">
                  <PublicFormGrid>
                    <PublicTextInput label="First Name" name="firstName" required />
                    <PublicTextInput label="Last Name" name="lastName" required />
                    <PublicTextInput label="Email" name="email" required type="email" />
                    <PublicTextInput label="Phone" name="phone" type="tel" />
                  </PublicFormGrid>
                </PublicFormSection>

                <PublicFormSection title="Gift Details">
                <fieldset>
                  <legend>
                    <PublicFieldLabel>
                    Donation Type
                    </PublicFieldLabel>
                  </legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {donationTypeOptions.map((option) => (
                      <label
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors ${
                          donationTypes.includes(option)
                            ? "border-[#D4A63D]/50 bg-[#fff3cf] text-stone-950"
                            : "border-stone-200 bg-white text-stone-700"
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

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <PublicSelect label="Projected Donation Amount" name="projectedAmountRange" required>
                      <option value="">Select range</option>
                      {projectedAmountOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </PublicSelect>
                  <PublicSelect label="Gift Intended For" name="intendedFor" required>
                      <option value="">Select use</option>
                      {intendedForOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </PublicSelect>
                </div>
                </PublicFormSection>

                <PublicFormSection title="Follow Up">
                  <div className="space-y-4">
                    <PublicTextarea label="Message / Notes" name="message" />
                    <PublicTextInput label="Best Time To Contact" name="bestTimeToContact" />
                  </div>
                </PublicFormSection>

                <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
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
                  <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                    {error}
                  </p>
                ) : null}
                <PublicFormSection title="Submit">
                <PublicSubmitButton disabled={status === "submitting"}>
                  {status === "submitting" ? "Submitting" : "Submit Inquiry"}
                </PublicSubmitButton>
                </PublicFormSection>
              </form>
            )}
              </div>
            </PublicFormShell>
          </div>
        </div>
      ) : null}
    </>
  );
}

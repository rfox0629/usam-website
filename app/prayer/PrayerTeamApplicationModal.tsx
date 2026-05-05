"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  PublicCheckbox,
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
import { getAllStrings, getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const availabilityOptions = [
  "Daily",
  "Weekly",
  "As Needed",
  "During Kitchen Table Meetings",
] as const;

function triggerClassName(variant: "primary" | "secondary") {
  return variant === "primary"
    ? "inline-flex min-h-[48px] items-center justify-center bg-stone-100 px-7 py-3.5 text-center text-sm uppercase tracking-[0.2em] text-stone-950 transition-all duration-300 hover:bg-amber-200"
    : "inline-flex min-h-[48px] items-center justify-center border border-stone-600 px-7 py-3.5 text-center text-sm uppercase tracking-[0.2em] text-stone-300 transition-all duration-300 hover:border-stone-400 hover:text-stone-100";
}

export function PrayerTeamApplicationModal({
  children = "Join the Prayer Team",
  initialOpen = false,
  variant = "primary",
}: {
  children?: ReactNode;
  initialOpen?: boolean;
  variant?: "primary" | "secondary";
}) {
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function openModal() {
    setIsOpen(true);
    setError("");
  }

  function closeModal() {
    if (status === "submitting") {
      return;
    }

    setIsOpen(false);
    setError("");
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstName = getString(formData, "first_name");
    const lastName = getString(formData, "last_name");
    const email = getString(formData, "email");
    const phone = getString(formData, "phone");
    const city = getString(formData, "city");
    const state = getString(formData, "state");
    const churchAffiliation = getString(formData, "church_affiliation");
    const referralSource = getString(formData, "referral_source");
    const motivation = getString(formData, "motivation");
    const emailAlerts = getString(formData, "email_alerts") === "yes";
    const smsAlerts = getString(formData, "sms_alerts") === "yes";
    const availability = getAllStrings(formData, "availability");
    const confidentialityAgreement = formData.get("confidentiality_agreement") === "on";

    if (!confidentialityAgreement) {
      setError("Please confirm the confidentiality agreement before submitting.");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "prayer_team_application",
        lastName,
        message: motivation,
        payload: {
          availability,
          church_affiliation: churchAffiliation,
          city,
          confidentiality_agreement: confidentialityAgreement,
          email_alerts: emailAlerts,
          motivation,
          referral_source: referralSource,
          sms_alerts: smsAlerts,
          state,
        },
        phone,
        sourcePage: "/prayer",
      });
      setStatus("success");
    } catch (submissionError) {
      setStatus("idle");
      setError(submissionError instanceof Error ? submissionError.message : "Your application could not be submitted. Please try again.");
    }
  }

  return (
    <>
      <button
        className={triggerClassName(variant)}
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        type="button"
      >
        {children}
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-10"
          role="dialog"
        >
          <div className="flex min-h-full items-start justify-center pt-8 md:pt-12">
            <div className="relative w-full max-w-[840px]">
              <button
                aria-label="Close prayer team application"
                className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={closeModal}
                type="button"
              >
                &times;
              </button>

              <PublicFormShell size="wide">
                <PublicFormHeader
                  description="Apply to become an approved USA Missionaries prayer partner. Our team reviews each application before assigning prayer coverage and future alerts."
                  eyebrow="Prayer Team"
                  note="Prayer requests may include sensitive ministry details. Approved prayer partners agree to handle all requests with care and confidentiality."
                  title="Join the Prayer Team"
                />

                {status === "success" ? (
                  <div className="mt-5">
                    <PublicFormMessage>
                      Thank you for applying to join the USA Missionaries Prayer Team. Our team will review your request and follow up with next steps.
                    </PublicFormMessage>
                    <button
                      className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-7 py-4 text-center text-xs uppercase tracking-[0.22em] text-stone-950 transition-all duration-300 hover:bg-[#F5B942]"
                      onClick={closeModal}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form className="mt-5 space-y-4" onSubmit={submitApplication}>
                    <PublicFormSection title="Contact Information">
                      <PublicFormGrid>
                        <PublicTextInput autoComplete="given-name" label="First name" name="first_name" required />
                        <PublicTextInput autoComplete="family-name" label="Last name" name="last_name" required />
                        <PublicTextInput autoComplete="email" label="Email" name="email" required type="email" />
                        <PublicTextInput autoComplete="tel" label="Phone" name="phone" type="tel" />
                      </PublicFormGrid>
                    </PublicFormSection>

                    <PublicFormSection title="Church / Location">
                      <PublicFormGrid>
                        <PublicTextInput autoComplete="address-level2" label="City" name="city" />
                        <PublicTextInput autoComplete="address-level1" label="State" name="state" />
                        <PublicTextInput label="Church affiliation" name="church_affiliation" />
                        <PublicTextInput label="How did you hear about USA Missionaries?" name="referral_source" />
                      </PublicFormGrid>
                      <div className="mt-4">
                        <PublicTextarea label="Why do you want to join the prayer team?" name="motivation" required rows={4} />
                      </div>
                    </PublicFormSection>

                    <PublicFormSection title="Prayer Availability">
                      <PublicFormGrid>
                        <PublicSelect label="Email alerts" name="email_alerts">
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </PublicSelect>
                        <PublicSelect label="SMS alerts" name="sms_alerts">
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </PublicSelect>
                      </PublicFormGrid>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {availabilityOptions.map((option) => (
                          <PublicCheckbox key={option} name="availability" value={option}>
                            {option}
                          </PublicCheckbox>
                        ))}
                      </div>
                    </PublicFormSection>

                    <PublicFormSection title="Confidentiality">
                      <PublicCheckbox name="confidentiality_agreement" required>
                        I understand prayer requests may include sensitive ministry details, and I agree to handle all requests with care and confidentiality.
                      </PublicCheckbox>
                      {error ? (
                        <div className="mt-4">
                          <PublicFormMessage tone="error">{error}</PublicFormMessage>
                        </div>
                      ) : null}
                      <div className="mt-5">
                        <PublicSubmitButton disabled={status === "submitting"}>
                          {status === "submitting" ? "Submitting" : "Submit Application"}
                        </PublicSubmitButton>
                      </div>
                    </PublicFormSection>
                  </form>
                )}
              </PublicFormShell>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

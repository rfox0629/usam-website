"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
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
import { getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const interestOptions = [
  "Become a missionary",
  "Start a Kitchen Table",
  "Partner with USA Missionaries",
  "Volunteer",
  "Bring this to my church",
  "Not sure yet",
] as const;

export function JoinMissionInterestModal({
  children = "Join the Mission",
  initialOpen = false,
}: {
  children?: ReactNode;
  initialOpen?: boolean;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<"error" | "idle" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialOpen) {
      openModal();
    }
  }, [initialOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function openModal() {
    setStatus("idle");
    setErrorMessage("");
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const city = getString(formData, "city");
    const state = getString(formData, "state");
    const churchAffiliation = getString(formData, "church_affiliation");
    const email = getString(formData, "email");
    const firstName = getString(formData, "first_name");
    const interest = getString(formData, "interest");
    const lastName = getString(formData, "last_name");
    const message = getString(formData, "message");
    const phone = getString(formData, "phone");
    const sourcePage = typeof window === "undefined"
      ? pathname || "/"
      : `${window.location.pathname}${window.location.search}`;

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "join_mission_interest",
        lastName,
        message,
        payload: {
          church_affiliation: churchAffiliation,
          city,
          email,
          first_name: firstName,
          interest,
          last_name: lastName,
          message,
          phone,
          state,
          source_page: sourcePage,
        },
        phone,
        sourcePage,
      });

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this form.");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const modal = isOpen && isMounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-5 md:py-10"
      onMouseDown={() => setIsOpen(false)}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center py-4 md:items-center md:py-8">
        <div
          aria-labelledby="join-mission-interest-title"
          aria-modal="true"
          className="relative w-full"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <PublicFormShell size="standard">
            <button
              aria-label="Close join the mission interest form"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              &times;
            </button>

            <div className="space-y-4">
              <PublicFormHeader
                description="If you feel called to be part of what God is building through USA Missionaries, tell us a little about yourself and our team will follow up."
                eyebrow="Join the Mission"
                note="This is not a formal application. It simply helps us understand your interest and how to follow up."
                title={<span id="join-mission-interest-title">Start the Conversation</span>}
              />

              {status === "success" ? (
                <PublicFormMessage>
                  Thank you for reaching out. Our team will review your interest and follow up with next steps.
                </PublicFormMessage>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <PublicFormSection title="Contact Information">
                    <PublicFormGrid>
                      <PublicTextInput autoComplete="given-name" label="First name" name="first_name" required />
                      <PublicTextInput autoComplete="family-name" label="Last name" name="last_name" required />
                      <PublicTextInput autoComplete="email" label="Email" name="email" required type="email" />
                      <PublicTextInput autoComplete="tel" label="Phone" name="phone" type="tel" />
                    </PublicFormGrid>
                  </PublicFormSection>

                  <PublicFormSection title="Location / Church">
                    <PublicFormGrid>
                      <PublicTextInput autoComplete="address-level2" label="City" name="city" />
                      <PublicTextInput autoComplete="address-level1" label="State" name="state" />
                    </PublicFormGrid>
                    <div className="mt-4">
                      <PublicTextInput label="Church affiliation" name="church_affiliation" />
                    </div>
                  </PublicFormSection>

                  <PublicFormSection title="Interest">
                    <PublicSelect label="How are you interested in joining?" name="interest" required>
                      <option value="">Select one</option>
                      {interestOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </PublicSelect>
                    <div className="mt-4">
                      <PublicTextarea
                        label="Tell us briefly what God is stirring in you"
                        name="message"
                        required
                        rows={4}
                      />
                    </div>
                  </PublicFormSection>

                  {status === "error" ? (
                    <PublicFormMessage tone="error">
                      {errorMessage || "Something went wrong. Please try again."}
                    </PublicFormMessage>
                  ) : null}

                  <PublicFormSection title="Submit">
                    <PublicSubmitButton disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Interest"}
                    </PublicSubmitButton>
                  </PublicFormSection>
                </form>
              )}
            </div>
          </PublicFormShell>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        className="inline-block cursor-pointer bg-stone-100 px-7 py-3 text-sm uppercase tracking-[0.2em] text-stone-950 transition-all duration-300 hover:bg-amber-200"
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        type="button"
      >
        {children}
      </button>
      {modal}
    </>
  );
}

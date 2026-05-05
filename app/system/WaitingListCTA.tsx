"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  PublicFieldLabel,
  PublicFormGrid,
  PublicFormHeader,
  PublicFormMessage,
  PublicFormSection,
  PublicFormShell,
  PublicSubmitButton,
  PublicTextarea,
  PublicTextInput,
} from "@/components/forms/PublicForm";
import { getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function WaitingListCTA({ initialAccessOpen = false }: { initialAccessOpen?: boolean }) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isWaitlistOpen && !isAccessOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsWaitlistOpen(false);
        setIsAccessOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isAccessOpen, isWaitlistOpen]);

  useEffect(() => {
    if (initialAccessOpen) {
      setIsAccessOpen(true);
    }
  }, [initialAccessOpen]);

  function openWaitlistModal() {
    setIsWaitlistOpen(true);
    setStatus("idle");
    setErrorMessage("");
  }

  function openAccessModal() {
    setAccessCode("");
    setAccessError("");
    setIsAccessOpen(true);
  }

  async function handleAccessSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = accessCode.trim();

    if (!trimmedCode) {
      setAccessError("Please enter your access code.");
      return;
    }

    setIsCheckingAccess(true);
    setAccessError("");

    try {
      const response = await fetch("/api/system-preview", {
        body: JSON.stringify({ password: trimmedCode }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Invalid access code");
      }

      setIsAccessOpen(false);
      router.push("/system#system-preview");
    } catch {
      setAccessError("This access code was not recognized.");
    } finally {
      setIsCheckingAccess(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await submitPublicForm({
        email: getString(formData, "email"),
        firstName: getString(formData, "firstName"),
        formType: "system_waitlist",
        lastName: getString(formData, "lastName"),
        message: getString(formData, "interest"),
        payload: {
          interest: getString(formData, "interest"),
          organization_or_church: getString(formData, "organization"),
          role: getString(formData, "role"),
        },
        phone: getString(formData, "phone"),
        sourcePage: "/system",
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

  return (
    <div className="mt-9 w-full max-w-full">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            openWaitlistModal();
          }}
          className="inline-flex min-h-12 w-full items-center justify-center border border-amber-400 bg-amber-400 px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-stone-950 transition-all duration-300 hover:border-amber-300 hover:bg-amber-300 sm:w-[230px] lg:w-auto"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Join The Waiting List
        </button>
        <button
          type="button"
          onClick={openAccessModal}
          className="inline-flex min-h-12 w-full items-center justify-center border border-stone-600 bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-stone-100 transition-all duration-300 hover:border-stone-300 hover:bg-white/[0.04] sm:w-[250px] lg:w-auto"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Enter With Access Code
        </button>
      </div>

      <p className="mt-4 max-w-md text-xs leading-6 text-[#9CA3AF]">
        Dashboard access is restricted to active operators and leadership.
      </p>

      {isAccessOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10 backdrop-blur-sm md:items-center md:py-14"
          onMouseDown={() => setIsAccessOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="system-access-title"
            aria-modal="true"
            className="relative w-full max-w-[520px]"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <PublicFormShell size="compact" className="max-w-[520px]">
              <button
                aria-label="Close access code modal"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={() => setIsAccessOpen(false)}
                type="button"
              >
                &times;
              </button>

              <PublicFormHeader
                description="If you’ve been given access to the USA Missionaries system, enter your code below."
                eyebrow="Authorized Access"
                note="Access is limited to invited operators and leadership."
                title={<span id="system-access-title">Enter Access Code</span>}
              />

              <form className="mt-5 space-y-4" onSubmit={handleAccessSubmit}>
                <PublicFormSection title="Access">
                  <div>
                    <PublicFieldLabel htmlFor="system-access-code" required>
                      Access Code
                    </PublicFieldLabel>
                    <input
                      autoComplete="one-time-code"
                      className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm"
                      id="system-access-code"
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="Enter your code"
                      type="password"
                      value={accessCode}
                    />
                  </div>
                  {accessError ? (
                    <div className="mt-4">
                      <PublicFormMessage tone="error">{accessError}</PublicFormMessage>
                    </div>
                  ) : null}
                  <div className="mt-5">
                    <PublicSubmitButton disabled={isCheckingAccess}>
                      {isCheckingAccess ? "Checking..." : "Enter System"}
                    </PublicSubmitButton>
                  </div>
                </PublicFormSection>
              </form>

              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-center text-xs uppercase tracking-[0.18em] text-stone-700 transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={() => {
                  setIsAccessOpen(false);
                  openWaitlistModal();
                }}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Request Access / Join Waiting List
              </button>
            </PublicFormShell>
          </div>
        </div>
      ) : null}

      {isWaitlistOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10 backdrop-blur-sm md:py-14"
          onMouseDown={() => setIsWaitlistOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-waitlist-title"
          >
            <PublicFormShell size="standard">
              <button
                type="button"
                onClick={() => setIsWaitlistOpen(false)}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                aria-label="Close waiting list modal"
              >
                &times;
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Early Access"
                  title={<span id="system-waitlist-title">Join the Waiting List</span>}
                  description="Join the waiting list to get early access as the USA Missionaries system opens to new teams."
                  note="Early access is limited. No spam, just updates as the system comes online."
                />

                {status === "success" ? (
                  <PublicFormMessage>
                    Thank you for joining the waitlist. We&apos;ll follow up as this system opens to new teams.
                  </PublicFormMessage>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <PublicFormSection title="Contact Information">
                      <PublicFormGrid>
                        <PublicTextInput label="First Name" name="firstName" required />
                        <PublicTextInput label="Last Name" name="lastName" required />
                        <PublicTextInput label="Email" name="email" type="email" autoComplete="email" required />
                        <PublicTextInput label="Phone" name="phone" type="tel" autoComplete="tel" />
                        <PublicTextInput label="Organization / Church" name="organization" />
                        <PublicTextInput label="Role" name="role" />
                      </PublicFormGrid>
                    </PublicFormSection>

                    <PublicFormSection title="What Are You Interested In?">
                      <PublicTextarea
                        label="Interest"
                        name="interest"
                        placeholder="Tell us where you hope to use this system."
                      />
                    </PublicFormSection>

                    {status === "error" ? (
                      <PublicFormMessage tone="error">
                        {errorMessage || "Something went wrong. Please try again."}
                      </PublicFormMessage>
                    ) : null}

                    <PublicFormSection title="Submit">
                      <PublicSubmitButton disabled={isSubmitting}>
                        {isSubmitting ? "Joining..." : "Join Early Access"}
                      </PublicSubmitButton>
                    </PublicFormSection>
                  </form>
                )}
              </div>
            </PublicFormShell>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import {
  PublicCheckbox,
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

type Status = "idle" | "success" | "error";

export function FieldReportsAccessCTA({ initialOpen = false }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function openModal() {
    setIsOpen(true);
    setStatus("idle");
    setErrorMessage("");
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsOpen(false);
    setStatus("idle");
    setErrorMessage("");
  }

  useEffect(() => {
    if (initialOpen) {
      openModal();
    }
  }, [initialOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting]);

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
        formType: "field_report_access",
        lastName: getString(formData, "lastName"),
        message: getString(formData, "reason"),
        payload: {
          follow_up_allowed: formData.get("followUpAllowed") === "on",
          organization_or_church: getString(formData, "organization"),
          reason_for_request: getString(formData, "reason"),
        },
        phone: getString(formData, "phone"),
        sourcePage: "/mission",
      });

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this request.");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-transparent px-7 py-3 text-center text-sm font-semibold uppercase tracking-[1px] text-white transition-all duration-200 ease-out hover:border-[#d4a017] hover:bg-[rgba(212,160,23,0.08)] hover:text-[#d4a017]"
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
      >
        Request Access to Field Reports
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm md:py-14"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-reports-access-title"
          onClick={closeModal}
        >
          <div className="relative w-full" onClick={(event) => event.stopPropagation()}>
            <PublicFormShell size="standard">
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                aria-label="Close field reports access form"
              >
                &times;
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Field Reports"
                  title={<span id="field-reports-access-title">Request Field Reports Access</span>}
                  description="For churches, leaders, and ministry partners seeking a high-level view of what God is doing through the movement."
                  note="Field Reports are private and intended for trusted leaders, partner churches, and approved ministry stakeholders."
                />

                {status === "success" ? (
                  <PublicFormMessage>
                    Thank you. Your request has been received. Our team will review it and follow up with next steps.
                  </PublicFormMessage>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <PublicFormSection title="Contact Information">
                      <PublicFormGrid>
                        <PublicTextInput label="First Name" name="firstName" required />
                        <PublicTextInput label="Last Name" name="lastName" required />
                        <PublicTextInput label="Email" name="email" type="email" autoComplete="email" required />
                        <PublicTextInput label="Phone" name="phone" type="tel" autoComplete="tel" />
                        <PublicTextInput label="Organization / Church" name="organization" required />
                      </PublicFormGrid>
                    </PublicFormSection>

                    <PublicFormSection title="Request Details">
                      <div className="space-y-4">
                        <PublicTextarea
                          label="Reason for Request"
                          name="reason"
                          placeholder="Briefly share how you are connected to USA Missionaries or why you would like access."
                          required
                        />
                        <PublicCheckbox name="followUpAllowed">
                          Yes, USA Missionaries may follow up with me about this request.
                        </PublicCheckbox>
                      </div>
                    </PublicFormSection>

                    {status === "error" ? (
                      <PublicFormMessage tone="error">
                        {errorMessage || "Something went wrong. Please try again or email info@usamissionaries.org."}
                      </PublicFormMessage>
                    ) : null}

                    <PublicFormSection title="Submit">
                      <PublicSubmitButton disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Request Access"}
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

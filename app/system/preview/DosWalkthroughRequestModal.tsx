"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import {
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
const sourcePage = "/system/preview";

export function DosWalkthroughRequestModal({
  initialOpen = false,
}: {
  initialOpen?: boolean;
}) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"error" | "idle" | "success">("idle");

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
    setErrorMessage("");
    setStatus("idle");
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setStatus("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = getString(formData, "email");
    const firstName = getString(formData, "first_name");
    const lastName = getString(formData, "last_name");
    const message = getString(formData, "message");
    const organization = getString(formData, "organization");
    const phone = getString(formData, "phone");
    const role = getString(formData, "role");

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "dos_walkthrough_request",
        lastName,
        message,
        payload: {
          email,
          first_name: firstName,
          last_name: lastName,
          message,
          organization_or_church: organization,
          phone,
          role,
          source_page: sourcePage,
        },
        phone,
        sourcePage,
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

  const modal = isOpen && isMounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-5 md:py-10"
      onMouseDown={() => setIsOpen(false)}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center py-4 md:items-center md:py-8">
        <div
          aria-labelledby="dos-walkthrough-title"
          aria-modal="true"
          className="relative w-full"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <PublicFormShell size="standard">
            <button
              aria-label="Close walkthrough request form"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              &times;
            </button>

            <div className="space-y-4">
              <PublicFormHeader
                description="Tell us a little about your team and what you would like to see. We will follow up to schedule a walkthrough of the Disciple Operating System."
                eyebrow="Disciple Operating System"
                title={<span id="dos-walkthrough-title">Request a Walkthrough</span>}
              />

              {status === "success" ? (
                <PublicFormMessage>
                  Thank you. Your walkthrough request has been received. Our team will follow up with next steps.
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

                  <PublicFormSection title="Organization">
                    <PublicFormGrid>
                      <PublicTextInput label="Organization / Church" name="organization" />
                      <PublicTextInput label="Role" name="role" />
                    </PublicFormGrid>
                  </PublicFormSection>

                  <PublicFormSection title="Walkthrough Focus">
                    <PublicTextarea
                      label="What would you like to see in DOS?"
                      name="message"
                      required
                      rows={4}
                    />
                  </PublicFormSection>

                  {status === "error" ? (
                    <PublicFormMessage tone="error">
                      {errorMessage || "Something went wrong. Please try again."}
                    </PublicFormMessage>
                  ) : null}

                  <PublicFormSection title="Submit">
                    <PublicSubmitButton disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Request"}
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
        className="inline-flex min-h-12 items-center justify-center border border-amber-400 bg-amber-400 px-6 text-center text-xs uppercase tracking-[0.24em] text-stone-950 transition-colors hover:border-amber-300 hover:bg-amber-300"
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        Request a Walkthrough
      </button>
      {modal}
    </>
  );
}

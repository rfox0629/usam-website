"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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

type Status = "error" | "idle" | "success";

export function MissionaryProfileReviewModal({
  initialOpen = false,
  missionaryId,
  missionaryName,
  profileSlug,
}: {
  initialOpen?: boolean;
  missionaryId: string;
  missionaryName: string;
  profileSlug: string;
}) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = getString(formData, "firstName");
    const lastName = getString(formData, "lastName");
    const email = getString(formData, "email");
    const reviewText = getString(formData, "reviewText");
    const submitterName = [firstName, lastName].filter(Boolean).join(" ").trim();

    try {
      await submitPublicForm({
        email,
        firstName,
        formType: "missionary_profile_review",
        lastName,
        message: reviewText,
        payload: {
          missionary_household_id: missionaryId,
          missionary_name: missionaryName,
          missionary_profile_id: missionaryId,
          permission_to_share: formData.get("permissionToShare") === "on",
          profile_slug: profileSlug,
          review_text: reviewText,
          submitter_email: email,
          submitter_name: submitterName,
        },
        sourcePage: `/missionaries/${profileSlug}`,
      });

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this review.");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] sm:w-auto"
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        Share Testimony
      </button>

      {isOpen ? (
        <div
          aria-labelledby="profile-review-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm md:py-14"
          onClick={closeModal}
          role="dialog"
        >
          <div className="relative w-full" onClick={(event) => event.stopPropagation()}>
            <PublicFormShell size="standard">
              <button
                aria-label="Close form"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={closeModal}
                type="button"
              >
                &times;
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Fruit From The Field"
                  title={<span id="profile-review-title">Share a Testimony</span>}
                  description={`Tell us what God has done through ${missionaryName}.`}
                  note="Submissions are reviewed before anything appears publicly."
                />

                {status === "success" ? (
                  <PublicFormMessage>
                    Thank you for sharing. This testimony has been received for review.
                  </PublicFormMessage>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <PublicFormSection title="Contact Information">
                      <PublicFormGrid>
                        <PublicTextInput label="First Name" name="firstName" required />
                        <PublicTextInput label="Last Name" name="lastName" required />
                        <PublicTextInput autoComplete="email" label="Email" name="email" required type="email" />
                      </PublicFormGrid>
                    </PublicFormSection>

                    <PublicFormSection title="Review / Testimony">
                      <PublicTextarea
                        label="What would you like to share?"
                        name="reviewText"
                        placeholder="Write your review or testimony here..."
                        required
                        rows={6}
                      />
                    </PublicFormSection>

                    <PublicFormSection title="Permission">
                      <PublicCheckbox name="permissionToShare" required>
                        I give USA Missionaries permission to review and potentially share this testimony publicly.
                      </PublicCheckbox>
                    </PublicFormSection>

                    {status === "error" ? (
                      <PublicFormMessage tone="error">
                        {errorMessage || "Something went wrong. Please try again."}
                      </PublicFormMessage>
                    ) : null}

                    <PublicFormSection title="Submit">
                      <PublicSubmitButton disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Testimony"}
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

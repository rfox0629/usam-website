"use client";

import React, { useEffect, useState } from "react";
import {
  PublicCheckbox,
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
import { getAllStrings, getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type ModalType = "experience" | "story";
type Status = "idle" | "success" | "error";

const experienceOptions = [
  "Life giving",
  "Encouraging",
  "Peaceful",
  "Challenging in a good way",
  "Transformational",
  "Not sure yet",
] as const;

const lifeChangeOptions = [
  "I feel closer to God",
  "I reconciled a relationship",
  "I surrendered something",
  "I made a decision to follow Jesus",
  "I joined a group",
  "I requested baptism",
  "Still processing",
] as const;

export function MissionReviewCTA() {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const isOpen = activeModal !== null;
  const isStory = activeModal === "story";

  function openModal(type: ModalType) {
    setActiveModal(type);
    setStatus("idle");
    setErrorMessage("");
  }

  function closeModal() {
    if (isSubmitting) return;
    setActiveModal(null);
    setStatus("idle");
    setErrorMessage("");
  }

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
    const submissionKind = isStory ? "mission_story" : "mission_quick_review";
    const firstName = isStory ? getString(formData, "firstName") : getString(formData, "name").split(/\s+/)[0] ?? "";
    const lastName = isStory
      ? getString(formData, "lastName")
      : getString(formData, "name").split(/\s+/).slice(1).join(" ");
    const message = isStory ? getString(formData, "impact") : getString(formData, "review");

    try {
      await submitPublicForm({
        email: getString(formData, "email"),
        firstName,
        formType: "general",
        lastName,
        message,
        payload: {
          experience_description: getAllStrings(formData, "experienceDescription"),
          impact: getString(formData, "impact"),
          life_change: getAllStrings(formData, "lifeChange"),
          other: getString(formData, "other"),
          permission: getString(formData, "permission"),
          review: getString(formData, "review"),
          submission_kind: submissionKind,
        },
        sourcePage: "/mission",
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
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => openModal("experience")}
          className="inline-block border-0 bg-[#d4a017] px-7 py-3 text-sm font-semibold uppercase tracking-[1px] text-black transition-all duration-200 ease-out hover:bg-[#e0ad2f] active:bg-[#c89514]"
          style={{ fontFamily: font.rajdhani }}
        >
          Quick Review
        </button>
        <button
          type="button"
          onClick={() => openModal("story")}
          className="inline-block border border-white/25 bg-transparent px-7 py-3 text-sm font-semibold uppercase tracking-[1px] text-white transition-all duration-200 ease-out hover:border-[#d4a017] hover:bg-[rgba(212,160,23,0.08)] hover:text-[#d4a017]"
          style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        >
          Share Your Story
        </button>
      </div>
      <p className="mt-[14px] max-w-[520px] text-[13px] leading-6 text-[#9CA3AF]">
        Quick Review is one or two sentences. Share Your Story is for a deeper testimony.
      </p>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm md:py-14"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-review-title"
          onClick={closeModal}
        >
          <div className="relative w-full" onClick={(event) => event.stopPropagation()}>
            <PublicFormShell size="standard">
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                aria-label="Close form"
              >
                &times;
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Mission Feedback"
                  title={<span id="mission-review-title">{isStory ? "Tell Your Story" : "Share Your Experience"}</span>}
                  description={isStory ? "Share what God did, what changed, or how the evening impacted you." : "Help others understand the mission in your own words."}
                  note="Your submission is reviewed before anything is shared publicly."
                />

                {status === "success" ? (
                  <PublicFormMessage>
                    {isStory
                      ? "Thank you for sharing your story. We will steward it with care."
                      : "Thank you. Your words help others understand what God is doing through USA Missionaries."}
                  </PublicFormMessage>
                ) : (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {isStory ? <StoryFields /> : <ExperienceFields />}

                    {status === "error" ? (
                      <PublicFormMessage tone="error">
                        {errorMessage || "Something went wrong. Please try again or email info@usamissionaries.org."}
                      </PublicFormMessage>
                    ) : null}

                    <PublicFormSection title="Submit">
                      <PublicSubmitButton disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : isStory ? "Submit Story" : "Submit Review"}
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

function ExperienceFields() {
  return (
    <>
      <PublicFormSection title="Contact Information">
        <PublicFormGrid>
          <PublicTextInput label="Name" name="name" required />
          <PublicTextInput label="Email" name="email" type="email" autoComplete="email" required />
        </PublicFormGrid>
      </PublicFormSection>

      <PublicFormSection title="Review">
        <PublicTextarea
          label="How would you describe USA Missionaries to someone who's never heard of it?"
          name="review"
          placeholder="Write your response here..."
          required
          rows={5}
        />
      </PublicFormSection>

      <PermissionField />
    </>
  );
}

function StoryFields() {
  return (
    <>
      <PublicFormSection title="Contact Information">
        <PublicFormGrid>
          <PublicTextInput label="First Name" name="firstName" required />
          <PublicTextInput label="Last Name" name="lastName" required />
          <PublicTextInput label="Email" name="email" type="email" autoComplete="email" required />
        </PublicFormGrid>
      </PublicFormSection>

      <CheckboxGroup
        legend="How would you describe your experience?"
        name="experienceDescription"
        options={experienceOptions}
      />

      <PublicFormSection title="Story">
        <PublicTextarea
          label="What impact did the evening have on you?"
          name="impact"
          placeholder="Write your response here..."
          required
          rows={5}
        />
      </PublicFormSection>

      <CheckboxGroup
        legend="Did anything change in your life because of this gathering?"
        name="lifeChange"
        options={lifeChangeOptions}
      />

      <PublicFormSection title="Additional Notes">
        <PublicTextarea
          label="Other"
          name="other"
          placeholder="Anything else you want to share?"
        />
      </PublicFormSection>

      <PermissionField legend="May we share your testimony?" privateOption="No, please keep my story private" />
    </>
  );
}

function CheckboxGroup({
  legend,
  name,
  options,
}: {
  legend: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <PublicFormSection title={legend}>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <PublicCheckbox key={option} name={name} value={option}>
            {option}
          </PublicCheckbox>
        ))}
      </div>
    </PublicFormSection>
  );
}

function PermissionField({
  legend = "May we share this publicly?",
  privateOption = "No, please keep this private",
}: {
  legend?: string;
  privateOption?: string;
}) {
  return (
    <PublicFormSection title={legend}>
      <fieldset>
        <PublicFieldLabel>{legend}</PublicFieldLabel>
        <div className="mt-3 grid gap-3">
          {["Yes, anonymously", "Yes, with my name included", privateOption].map((option) => (
            <label key={option} className="flex min-h-12 items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 transition-colors hover:border-[#D4A63D]/55">
              <input type="radio" name="permission" value={option} required className="mt-1 h-4 w-4 accent-[#D4A63D]" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </PublicFormSection>
  );
}

"use client";

import React, { useEffect, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif", oswald: "'Oswald', sans-serif" };

type ModalType = "experience" | "story";
type Status = "idle" | "success" | "error";

const fieldClass =
  "w-full rounded-md border border-white/[0.2] bg-white/[0.06] px-4 py-[14px] text-base text-white outline-none transition-all placeholder:text-white/[0.55] hover:border-white/[0.28] focus:border-[#d4a017] focus:shadow-[0_0_0_1px_rgba(212,160,23,0.4)]";
const labelClass = "mb-4 block text-[12px] uppercase tracking-[1.2px] text-white/[0.75]";
const optionClass =
  "flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.12] bg-white/[0.04] px-4 py-[14px] text-sm font-medium leading-6 text-white/[0.9] transition-colors hover:border-white/[0.2] hover:bg-white/[0.08]";

export function MissionReviewCTA() {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const isOpen = activeModal !== null;

  function openModal(type: ModalType) {
    setActiveModal(type);
    setStatus("idle");
  }

  function closeModal() {
    if (isSubmitting) return;
    setActiveModal(null);
    setStatus("idle");
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isStory = activeModal === "story";

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
      <p className="mt-[14px] max-w-[520px] text-[13px] leading-6 text-white/[0.55]">
        Quick Review is one or two sentences. Share Your Story is for a deeper testimony.
      </p>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-review-title"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[calc(100vh-48px)] w-[calc(100%-32px)] max-w-[560px] overflow-y-auto rounded-[10px] border border-white/[0.14] bg-[#0b0b0c] p-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/10 text-xl leading-none text-white/55 transition-colors hover:border-white/25 hover:text-white"
              aria-label="Close form"
            >
              &times;
            </button>

            {status === "success" ? (
              <div className="pr-8">
                <h2 id="mission-review-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
                  Thank you.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/[0.75]">
                  {isStory
                    ? "Thank you for sharing your story. We will steward it with care."
                    : "Thank you. Your words help others understand what God is doing through USA Missionaries."}
                </p>
                {!isStory && (
                  <p className="mt-3 text-sm leading-6 text-white/[0.55]">
                    If you are willing to share more about your experience, we may follow up with a private reflection form.
                  </p>
                )}
              </div>
            ) : isStory ? (
              <StoryForm
                status={status}
                isSubmitting={isSubmitting}
                onSubmit={(event) => handleSubmit(event, "https://formspree.io/f/mnjlwgyz")}
              />
            ) : (
              <ExperienceForm
                status={status}
                isSubmitting={isSubmitting}
                onSubmit={(event) => handleSubmit(event, "https://formspree.io/f/xojyrjad")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExperienceForm({
  status,
  isSubmitting,
  onSubmit,
}: {
  status: Status;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="pr-8">
        <h2 id="mission-review-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
          Share Your Experience
        </h2>
        <p className="mt-2 text-base leading-7 text-white/[0.75]">
          Help others understand the mission in your own words.
        </p>
      </div>

      <form className="mt-7" method="POST" onSubmit={onSubmit}>
        <input type="hidden" name="_subject" value="New USA Missionaries Review" />

        <div className="mb-5">
          <label htmlFor="mission-review-name" className={labelClass} style={{ fontFamily: font.rajdhani }}>
            Name
          </label>
          <input id="mission-review-name" type="text" name="name" required placeholder="Your name" className={fieldClass} />
        </div>

        <div className="mb-6">
          <label htmlFor="mission-review-email" className={labelClass} style={{ fontFamily: font.rajdhani }}>
            Email
          </label>
          <input id="mission-review-email" type="email" name="email" required placeholder="Your email address" className={fieldClass} />
        </div>

        <div className="mb-6">
          <label
            htmlFor="mission-review-response"
            className="mb-4 block text-[13px] font-semibold uppercase leading-[1.5] tracking-[1.2px] text-white/[0.9]"
            style={{ fontFamily: font.rajdhani }}
          >
            How would you describe USA Missionaries to someone who&rsquo;s never heard of it?
          </label>
          <textarea
            id="mission-review-response"
            name="review"
            required
            placeholder="Write your response here..."
            className={`${fieldClass} min-h-[160px] resize-none p-4 leading-[1.5]`}
          />
        </div>

        <PermissionField />

        <SubmitArea
          status={status}
          isSubmitting={isSubmitting}
          submitText="Submit Review"
          submittingText="Submitting..."
        />
      </form>
    </>
  );
}

function StoryForm({
  status,
  isSubmitting,
  onSubmit,
}: {
  status: Status;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="pr-8">
        <h2 id="mission-review-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
          Tell Your Story
        </h2>
        <p className="mt-2 text-base leading-7 text-white/[0.75]">
          Share what God did, what changed, or how the evening impacted you.
        </p>
      </div>

      <form className="mt-7" method="POST" onSubmit={onSubmit}>
        <input type="hidden" name="_subject" value="New USA Missionaries Story" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="mission-story-first-name" className={labelClass} style={{ fontFamily: font.rajdhani }}>
              First name
            </label>
            <input id="mission-story-first-name" type="text" name="first_name" required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="mission-story-last-name" className={labelClass} style={{ fontFamily: font.rajdhani }}>
              Last name
            </label>
            <input id="mission-story-last-name" type="text" name="last_name" required className={fieldClass} />
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="mission-story-email" className={labelClass} style={{ fontFamily: font.rajdhani }}>
            Email
          </label>
          <input id="mission-story-email" type="email" name="email" required className={fieldClass} />
        </div>

        <CheckboxGroup
          legend="How would you describe your experience?"
          name="experience_description"
          options={[
            "Life giving",
            "Encouraging",
            "Peaceful",
            "Challenging in a good way",
            "Transformational",
            "Not sure yet",
          ]}
        />

        <div className="mt-6">
          <label htmlFor="mission-story-impact" className={labelClass} style={{ fontFamily: font.rajdhani }}>
            What impact did the evening have on you?
          </label>
          <textarea
            id="mission-story-impact"
            name="impact"
            required
            placeholder="Write your response here..."
            className={`${fieldClass} min-h-[140px] resize-none p-4 leading-[1.5]`}
          />
        </div>

        <CheckboxGroup
          legend="Did anything change in your life because of this gathering?"
          name="life_change"
          options={[
            "I feel closer to God",
            "I reconciled a relationship",
            "I surrendered something",
            "I made a decision to follow Jesus",
            "I joined a group",
            "I requested baptism",
            "Still processing",
          ]}
        />

        <div className="mt-6">
          <label htmlFor="mission-story-other" className={labelClass} style={{ fontFamily: font.rajdhani }}>
            Other
          </label>
          <textarea
            id="mission-story-other"
            name="other"
            placeholder="Anything else you want to share?"
            className={`${fieldClass} min-h-[100px] resize-none p-4 leading-[1.5]`}
          />
        </div>

        <PermissionField legend="May we share your testimony?" privateOption="No, please keep my story private" />

        <SubmitArea
          status={status}
          isSubmitting={isSubmitting}
          submitText="Submit Story"
          submittingText="Submitting..."
        />
      </form>
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
  options: string[];
}) {
  return (
    <fieldset className="mt-6">
      <legend className={labelClass} style={{ fontFamily: font.rajdhani }}>
        {legend}
      </legend>
      <div className="grid gap-3">
        {options.map((option) => (
          <label key={option} className={optionClass}>
            <input type="checkbox" name={name} value={option} className="mt-1 h-4 w-4 rounded accent-[#d4a017]" />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
    <fieldset className="mb-8 mt-6">
      <legend className={labelClass} style={{ fontFamily: font.rajdhani }}>
        {legend}
      </legend>
      <div className="grid gap-3">
        {["Yes, anonymously", "Yes, with my name included", privateOption].map((option) => (
          <label key={option} className={optionClass}>
            <input type="radio" name="permission" value={option} required className="mt-1 h-4 w-4 accent-[#d4a017]" />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SubmitArea({
  status,
  isSubmitting,
  submitText,
  submittingText,
}: {
  status: Status;
  isSubmitting: boolean;
  submitText: string;
  submittingText: string;
}) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 w-full items-center justify-center rounded border-0 bg-[#d4a017] px-6 py-[14px] text-sm font-semibold uppercase tracking-[1px] text-black transition-all duration-200 ease-out hover:bg-[#e0ad2f] active:bg-[#c89514] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        style={{ fontFamily: font.rajdhani }}
      >
        {isSubmitting ? submittingText : submitText}
      </button>

      {status === "error" && (
        <p className="text-sm leading-6 text-amber-400">
          Something went wrong. Please try again or email info@usamissionaries.org.
        </p>
      )}
    </div>
  );
}

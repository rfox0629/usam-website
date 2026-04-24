"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif", oswald: "'Oswald', sans-serif" };

export function MissionReviewCTA({ accessLink }: { accessLink?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function closeModal() {
    if (isSubmitting) return;
    setIsOpen(false);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("https://formspree.io/f/xojyrjad", {
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

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row">
        {accessLink ?? (
          <Link
            href="mailto:info@usamissionaries.org"
            className="inline-block bg-stone-100 px-7 py-3 text-sm uppercase tracking-[0.2em] text-stone-950 transition-all duration-300 hover:bg-amber-200"
            style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
          >
            Request Dashboard Access
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setStatus("idle");
          }}
          className="inline-block border border-stone-600 px-7 py-3 text-sm uppercase tracking-[0.2em] text-stone-300 transition-all duration-300 hover:border-stone-400 hover:text-stone-100"
          style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
        >
          Leave A Review
        </button>
      </div>

      <p className="mt-4 max-w-md text-xs leading-6 text-stone-600">
        Dashboard access is restricted to active operators and leadership.
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
            className="relative max-h-[calc(100vh-48px)] w-[calc(100%-32px)] max-w-[560px] overflow-y-auto rounded-[10px] border border-white/[0.12] bg-[#0b0b0c] p-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/10 text-xl leading-none text-white/55 transition-colors hover:border-white/25 hover:text-white"
              aria-label="Close review form"
            >
              &times;
            </button>

            {status === "success" ? (
              <div className="pr-8">
                <h2 id="mission-review-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
                  Thank you.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/[0.75]">
                  Thank you. Your words help others understand what God is doing through USA Missionaries.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/[0.55]">
                  If you are willing to share more about your experience, we may follow up with a private reflection form.
                </p>
              </div>
            ) : (
              <>
                <div className="pr-8">
                  <h2 id="mission-review-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
                    Leave a Review
                  </h2>
                  <p className="mt-2 text-base leading-7 text-white/[0.75]">
                    Help others understand the mission in your own words.
                  </p>
                </div>

                <form className="mt-7" method="POST" onSubmit={handleSubmit}>
                  <input type="hidden" name="_subject" value="New USA Missionaries Review" />

                  <div className="mb-5">
                    <label
                      htmlFor="mission-review-name"
                      className="mb-4 block text-[12px] uppercase tracking-[1.2px] text-white/[0.65]"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      Name optional
                    </label>
                    <input
                      id="mission-review-name"
                      type="text"
                      name="name"
                      placeholder="Name optional"
                      className="w-full rounded-md border border-white/[0.18] bg-white/[0.06] px-4 py-[14px] text-base text-white outline-none transition-all placeholder:text-white/50 hover:border-white/[0.28] focus:border-[#d4a017] focus:shadow-[0_0_0_1px_rgba(212,160,23,0.4)]"
                    />
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="mission-review-email"
                      className="mb-4 block text-[12px] uppercase tracking-[1.2px] text-white/[0.65]"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      Email optional
                    </label>
                    <input
                      id="mission-review-email"
                      type="email"
                      name="email"
                      placeholder="Email optional"
                      className="w-full rounded-md border border-white/[0.18] bg-white/[0.06] px-4 py-[14px] text-base text-white outline-none transition-all placeholder:text-white/50 hover:border-white/[0.28] focus:border-[#d4a017] focus:shadow-[0_0_0_1px_rgba(212,160,23,0.4)]"
                    />
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="mission-review-response"
                      className="mb-4 block text-[12px] font-semibold uppercase leading-[1.5] tracking-[1.2px] text-white"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      How would you describe USA Missionaries to someone who&rsquo;s never heard of it?
                    </label>
                    <textarea
                      id="mission-review-response"
                      name="review"
                      required
                      placeholder="Write your response here…"
                      className="min-h-[160px] w-full resize-none rounded-md border border-white/[0.18] bg-white/[0.06] p-4 text-base leading-[1.5] text-white outline-none transition-all placeholder:text-white/50 hover:border-white/[0.28] focus:border-[#d4a017] focus:shadow-[0_0_0_1px_rgba(212,160,23,0.4)]"
                    />
                  </div>

                  <fieldset className="mb-8">
                    <legend
                      className="mb-4 block text-[12px] uppercase tracking-[1.2px] text-white/[0.65]"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      May we share this publicly?
                    </legend>
                    <div className="grid gap-3">
                      {[
                        "Yes, anonymously",
                        "Yes, with my name included",
                        "No, please keep this private",
                      ].map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-white/[0.12] bg-white/[0.04] px-4 py-[14px] text-sm leading-6 text-white/[0.85] transition-colors hover:border-white/[0.2] hover:bg-white/[0.08]"
                        >
                          <input
                            type="radio"
                            name="permission"
                            value={option}
                            required
                            className="mt-1 h-4 w-4 accent-[#d4a017]"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded bg-white px-6 py-[14px] text-sm font-semibold uppercase tracking-[1px] text-black transition-all duration-300 hover:bg-[#d4a017] hover:text-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Review"}
                    </button>

                    {status === "error" && (
                      <p className="text-sm leading-6 text-amber-400">
                        Something went wrong. Please try again or email info@usamissionaries.org.
                      </p>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

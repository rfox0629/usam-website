"use client";

import React, { useEffect, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif", oswald: "'Oswald', sans-serif" };
const endpoint = "https://formspree.io/f/xrerjoke";
const fieldClass =
  "w-full rounded-md border border-white/[0.24] bg-white/[0.09] px-4 py-[14px] text-base text-white outline-none transition-all placeholder:text-white/[0.62] hover:border-white/[0.34] focus:border-[#d4a017] focus:shadow-[0_0_0_1px_rgba(212,160,23,0.4)]";
const labelClass = "mb-4 block text-[12px] uppercase tracking-[1.2px] text-white/[0.9]";

type Status = "idle" | "success" | "error";

export function FieldReportsAccessCTA() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  function openModal() {
    setIsOpen(true);
    setStatus("idle");
  }

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
      const response = await fetch(form.action, {
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
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-transparent px-7 py-3 text-center text-sm font-semibold uppercase tracking-[1px] text-white transition-all duration-200 ease-out hover:border-[#d4a017] hover:bg-[rgba(212,160,23,0.08)] hover:text-[#d4a017]"
        style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
      >
        Request Access to Field Reports
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-reports-access-title"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[calc(100vh-48px)] w-[calc(100%-32px)] max-w-[560px] overflow-y-auto rounded-[10px] border border-white/[0.18] bg-[#111113] p-[22px] shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)] md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/10 text-xl leading-none text-white/55 transition-colors hover:border-white/25 hover:text-white"
              aria-label="Close field reports access form"
            >
              &times;
            </button>

            {status === "success" ? (
              <div className="pr-8">
                <h2 id="field-reports-access-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
                  Thank you.
                </h2>
                <p className="mt-4 text-base leading-7 text-white/[0.75]">
                  Thank you. Your request has been received. Our team will review it and follow up soon.
                </p>
              </div>
            ) : (
              <>
                <div className="pr-8">
                  <h2 id="field-reports-access-title" className="text-[28px] font-semibold leading-[1.4] text-white" style={{ fontFamily: font.oswald }}>
                    Request Field Reports Access
                  </h2>
                  <p className="mt-2 text-base leading-7 text-white/[0.82]">
                    For churches, leaders, and ministry partners seeking a high-level view of what God is doing through the movement.
                  </p>
                </div>

                <form className="mt-7" action={endpoint} method="POST" onSubmit={handleSubmit}>
                  <input type="hidden" name="_subject" value="Field Reports Access Request" />

                  <div className="mb-5">
                    <label htmlFor="field-reports-name" className={labelClass} style={{ fontFamily: font.rajdhani }}>
                      Full Name
                    </label>
                    <input id="field-reports-name" type="text" name="name" required className={fieldClass} />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="field-reports-email" className={labelClass} style={{ fontFamily: font.rajdhani }}>
                      Email
                    </label>
                    <input id="field-reports-email" type="email" name="email" required className={fieldClass} />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="field-reports-organization" className={labelClass} style={{ fontFamily: font.rajdhani }}>
                      Organization / Church
                    </label>
                    <input id="field-reports-organization" type="text" name="organization" required className={fieldClass} />
                  </div>

                  <div className="mb-5">
                    <label htmlFor="field-reports-role" className={labelClass} style={{ fontFamily: font.rajdhani }}>
                      Role
                    </label>
                    <input
                      id="field-reports-role"
                      type="text"
                      name="role"
                      required
                      placeholder="Pastor, ministry leader, donor, partner, etc."
                      className={fieldClass}
                    />
                  </div>

                  <div className="mb-6">
                    <label htmlFor="field-reports-reason" className={labelClass} style={{ fontFamily: font.rajdhani }}>
                      Why are you requesting access?
                    </label>
                    <textarea
                      id="field-reports-reason"
                      name="reason"
                      required
                      placeholder="Briefly share how you are connected to USA Missionaries or why you would like access."
                      className={`${fieldClass} min-h-[140px] resize-none p-4 leading-[1.5]`}
                    />
                  </div>

                  <p className="rounded-md border border-white/[0.1] bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/[0.72]">
                    Field Reports are private and intended for trusted leaders, partner churches, and approved ministry stakeholders. Individual stories and personal details are stewarded with care.
                  </p>

                  <div className="mt-8 flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded border-0 bg-[#d4a017] px-6 py-[14px] text-sm font-semibold uppercase tracking-[1px] text-black transition-all duration-200 ease-out hover:bg-[#e0ad2f] active:bg-[#c89514] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      style={{ fontFamily: font.rajdhani }}
                    >
                      {isSubmitting ? "Submitting..." : "Request Access"}
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
    </>
  );
}

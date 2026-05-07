"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  PublicFormHeader,
  PublicFormMessage,
  PublicFormSection,
  PublicFormShell,
  PublicSelect,
  PublicSubmitButton,
  PublicTextarea,
} from "@/components/forms/PublicForm";
import { productFeedbackCategories, productFeedbackCategoryLabel } from "@/src/lib/dos/product-feedback";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function ImproveDosFeedbackModal({
  children = "Improve DOS",
  className = "inline-flex min-h-12 items-center justify-center border border-stone-700 bg-transparent px-6 text-center text-xs uppercase tracking-[0.24em] text-stone-100 transition-colors hover:border-amber-400 hover:text-amber-300",
  initialOpen = false,
}: {
  children?: ReactNode;
  className?: string;
  initialOpen?: boolean;
}) {
  const pathname = usePathname();
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
    setErrorMessage("");
    setIsSubmitting(true);
    setStatus("idle");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const category = String(formData.get("category") ?? "").trim();
    const messageText = String(formData.get("message_text") ?? "").trim();
    const pagePath = typeof window === "undefined"
      ? pathname || "/system/preview"
      : `${window.location.pathname}${window.location.search}`;

    try {
      const response = await fetch("/api/product-feedback", {
        body: JSON.stringify({
          category,
          messageText,
          pagePath,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to submit feedback.");
      }

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit feedback.");
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
          aria-labelledby="improve-dos-title"
          aria-modal="true"
          className="relative w-full"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <PublicFormShell size="standard">
            <button
              aria-label="Close feedback form"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              &times;
            </button>

            <div className="space-y-4">
              <PublicFormHeader
                description="Share what felt broken, confusing, missing, or helpful. Keep private ministry details out of feedback unless they are necessary."
                eyebrow="Product Feedback"
                note="Feedback goes to the Command Center for review."
                title={<span id="improve-dos-title">Improve DOS</span>}
              />

              {status === "success" ? (
                <PublicFormMessage>
                  Thank you. Your feedback was sent to the product queue.
                </PublicFormMessage>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <PublicFormSection title="Feedback">
                    <PublicSelect label="Category" name="category" required>
                      <option value="">Select one</option>
                      {productFeedbackCategories.map((category) => (
                        <option key={category} value={category}>
                          {productFeedbackCategoryLabel(category)}
                        </option>
                      ))}
                    </PublicSelect>
                    <div className="mt-4">
                      <PublicTextarea
                        label="What should we improve?"
                        name="message_text"
                        required
                        rows={5}
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
                      {isSubmitting ? "Submitting..." : "Submit Feedback"}
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
        className={className}
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {children}
      </button>
      {modal}
    </>
  );
}

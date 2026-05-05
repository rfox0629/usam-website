"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  PublicFieldLabel,
  PublicFormGrid,
  PublicFormHeader,
  PublicFormMessage,
  PublicFormSection,
  PublicFormShell,
  PublicSubmitButton,
  PublicTextInput,
} from "@/components/forms/PublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type AccessFlow = "system" | "team";

type AccessCodeModalProps = {
  alreadyHasAccess?: boolean;
  initialOpen?: boolean;
  onSecondaryClick?: () => void;
  redirectPath: string;
  secondaryHref?: string;
  secondaryLabel: string;
  sourcePage: string;
  triggerClassName: string;
  triggerLabel: ReactNode;
  type: AccessFlow;
};

const modalCopy = {
  system: {
    eyebrow: "Authorized Access",
    note: "Access is limited to invited operators and leadership.",
    submit: "Enter System",
    subtitle: "If you’ve been given access to the USA Missionaries system, enter your code below.",
    title: "Enter Access Code",
  },
  team: {
    eyebrow: "Team Access",
    note: "Team access is limited to invited supporters, partners, and leadership.",
    submit: "View Team",
    subtitle: "Enter your information and access code to view the USA Missionaries team.",
    title: "View the Missionary Team",
  },
} as const;

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";
}

export function AccessCodeModal({
  alreadyHasAccess = false,
  initialOpen = false,
  onSecondaryClick,
  redirectPath,
  secondaryHref,
  secondaryLabel,
  sourcePage,
  triggerClassName,
  triggerLabel,
  type,
}: AccessCodeModalProps) {
  const router = useRouter();
  const copy = modalCopy[type];
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(initialOpen && !alreadyHasAccess);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialOpen && !alreadyHasAccess) {
      setIsOpen(true);
    }
  }, [alreadyHasAccess, initialOpen]);

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
    if (alreadyHasAccess) {
      router.push(redirectPath);
      return;
    }

    setAccessCode("");
    setError("");
    setIsOpen(true);
  }

  function handleSecondaryClick() {
    setIsOpen(false);

    if (onSecondaryClick) {
      onSecondaryClick();
      return;
    }

    if (secondaryHref) {
      router.push(secondaryHref);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmedCode = accessCode.trim();
    const trimmedFirstName = String(formData.get("first_name") ?? "").trim();
    const trimmedLastName = String(formData.get("last_name") ?? "").trim();
    const trimmedEmail = String(formData.get("email") ?? "").trim();

    if (!trimmedCode) {
      setError("Please enter your access code.");
      return;
    }

    if (type === "team" && (!trimmedFirstName || !trimmedLastName || !trimmedEmail)) {
      setError("Please complete the required fields.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/access/validate", {
        body: JSON.stringify({
          accessCode: trimmedCode,
          email: trimmedEmail,
          firstName: trimmedFirstName,
          flow: type,
          lastName: trimmedLastName,
          sourcePage,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string; redirectTo?: string };

      if (!response.ok) {
        throw new Error(result.error || "This access code was not recognized.");
      }

      setIsOpen(false);
      router.push(result.redirectTo || redirectPath);
      router.refresh();
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : "This access code was not recognized.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className={triggerClassName}
        onClick={openModal}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10 backdrop-blur-sm md:items-center md:py-14"
          onMouseDown={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby={`access-modal-${type}-title`}
            aria-modal="true"
            className="relative w-full max-w-[520px]"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <PublicFormShell size="compact" className="max-w-[520px]">
              <button
                aria-label={`Close ${copy.title}`}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                &times;
              </button>

              <PublicFormHeader
                description={copy.subtitle}
                eyebrow={copy.eyebrow}
                note={copy.note}
                title={<span id={`access-modal-${type}-title`}>{copy.title}</span>}
              />

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <PublicFormSection title={type === "team" ? "Access Details" : "Access"}>
                  {type === "team" ? (
                    <PublicFormGrid>
                      <PublicTextInput
                        autoComplete="given-name"
                        label="First name"
                        name="first_name"
                        required
                        type="text"
                      />
                      <PublicTextInput
                        autoComplete="family-name"
                        label="Last name"
                        name="last_name"
                        required
                        type="text"
                      />
                    </PublicFormGrid>
                  ) : null}

                  {type === "team" ? (
                    <div className="mt-4">
                      <PublicTextInput
                        autoComplete="email"
                        label="Email"
                        name="email"
                        required
                        type="email"
                      />
                    </div>
                  ) : null}

                  <div className={type === "team" ? "mt-4" : ""}>
                    <PublicFieldLabel htmlFor={`access-code-${type}`} required>
                      Access Code
                    </PublicFieldLabel>
                    <input
                      autoComplete="one-time-code"
                      className={fieldClassName()}
                      id={`access-code-${type}`}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="Enter your code"
                      type="password"
                      value={accessCode}
                    />
                  </div>

                  {error ? (
                    <div className="mt-4">
                      <PublicFormMessage tone="error">{error}</PublicFormMessage>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <PublicSubmitButton disabled={isSubmitting}>
                      {isSubmitting ? "Checking..." : copy.submit}
                    </PublicSubmitButton>
                  </div>
                </PublicFormSection>
              </form>

              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-center text-xs uppercase tracking-[0.18em] text-stone-700 transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                onClick={handleSecondaryClick}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                {secondaryLabel}
              </button>
            </PublicFormShell>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  PublicFormHeader,
  PublicFormSection,
  PublicFormShell,
} from "@/components/forms/PublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type StoryReadMoreButtonProps = {
  buttonLabel?: string;
  paragraphs: readonly string[];
  title?: string;
};

export function StoryReadMoreButton({
  buttonLabel = "Read More",
  paragraphs,
  title = "Our Story",
}: StoryReadMoreButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] sm:w-auto"
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/75 px-4 py-9 backdrop-blur-md sm:px-5 md:py-10"
          role="dialog"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative mx-auto w-full max-w-[840px]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close story"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-sm uppercase tracking-[0.16em] text-stone-950 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950 md:right-5 md:top-5"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              onClick={() => setIsOpen(false)}
            >
              X
            </button>

            <PublicFormShell size="wide">
              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Missionary Profile"
                  title={title}
                  description={
                    <>
                      Read the public story behind this missionary household and their calling.
                    </>
                  }
                />

                <PublicFormSection title="Story">
                  <div className="relative">
                    <div className="max-h-[58vh] overflow-y-auto pr-2 md:max-h-[62vh]">
                      <div className="max-w-[760px] space-y-5 text-[17px] leading-[1.7] md:space-y-6 md:text-lg">
                        {paragraphs.map((paragraph) => (
                          <p className="text-stone-900" key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </PublicFormSection>
              </div>
            </PublicFormShell>
          </div>
        </div>
      ) : null}
    </>
  );
}

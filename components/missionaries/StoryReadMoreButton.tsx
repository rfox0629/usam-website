"use client";

import { useEffect, useState } from "react";
import {
  PublicFormHeader,
  PublicFormSection,
  PublicFormShell,
} from "@/components/forms/PublicForm";

const font = { rajdhani: "'Rajdhani', sans-serif" };

type StoryReadMoreButtonProps = {
  paragraphs: readonly string[];
  title?: string;
};

export function StoryReadMoreButton({
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
        Read More
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/75 px-4 py-10 backdrop-blur-md sm:px-5 md:py-14"
          role="dialog"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative w-full"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <PublicFormShell size="wide">
              <button
                type="button"
                aria-label="Close story"
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-sm uppercase tracking-[0.16em] text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                onClick={() => setIsOpen(false)}
              >
                X
              </button>

              <div className="space-y-4">
                <PublicFormHeader
                  eyebrow="Missionary Profile"
                  title={title}
                  description="Read the public story behind this missionary household and their calling."
                />

                <PublicFormSection title="Story">
                  <div className="max-h-[58vh] space-y-5 overflow-y-auto pr-1 text-[16px] leading-8 text-[#292524] md:max-h-[62vh] md:text-[17px]">
                    {paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
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

"use client";

import { useEffect, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm sm:px-5 md:py-12"
          role="dialog"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative mx-auto w-full max-w-[840px] rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-5 text-stone-950 shadow-[0_28px_90px_rgba(12,10,9,0.28)] md:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close story"
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-sm transition-colors hover:border-[#D4A63D] hover:text-stone-950"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              onClick={() => setIsOpen(false)}
            >
              X
            </button>

            <div className="pr-12">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                MISSIONARY PROFILE
              </p>
              <h2 className="mt-3 text-4xl font-bold uppercase leading-none text-stone-950 md:text-5xl" style={{ fontFamily: font.oswald }}>
                {title}
              </h2>
            </div>

            <div className="mt-7">
              <div className="space-y-5 text-base leading-[1.65] text-stone-800 md:text-lg">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

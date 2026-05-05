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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-stone-800 bg-[#050505] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] md:p-8"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close story"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center border border-white/[0.18] bg-white/[0.04] text-sm uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              onClick={() => setIsOpen(false)}
            >
              X
            </button>

            <div className="pr-12">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Missionary Profile
              </p>
              <h2 className="mt-3 text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
                {title}
              </h2>
            </div>

            <div className="mt-8 border-l-2 border-[#D4A63D]/70 pl-6 md:pl-8">
              <div className="space-y-5 text-base leading-8 text-stone-300 md:text-lg md:leading-9">
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

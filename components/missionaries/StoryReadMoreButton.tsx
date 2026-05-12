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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 px-4 py-5 backdrop-blur-md sm:px-5 md:py-8"
          role="dialog"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[calc(100vh-2.5rem)] w-full max-w-4xl overflow-hidden border border-white/10 bg-[#050505] shadow-[0_30px_120px_rgba(0,0,0,0.75)] md:max-h-[calc(100vh-4rem)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close story"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-[#D4A63D]/70 hover:bg-[#D4A63D]/10 hover:text-white md:right-6 md:top-6"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              onClick={() => setIsOpen(false)}
            >
              X
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#D4A63D]/10 to-transparent" />

            <div className="relative flex max-h-[calc(100vh-2.5rem)] flex-col px-5 py-6 sm:px-7 md:max-h-[calc(100vh-4rem)] md:px-10 md:py-9">
              <header className="shrink-0 pr-12">
                <p
                  className="text-[10px] uppercase tracking-[0.24em] text-[#D4A63D] md:text-[11px]"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Missionary Profile
                </p>
                <h2
                  className="mt-3 text-4xl font-bold uppercase leading-none text-white md:text-6xl"
                  style={{ fontFamily: font.oswald }}
                >
                  {title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400 md:text-base md:leading-7">
                  Read the public story behind this missionary household and their calling.
                </p>
                <div className="mt-6 h-px w-full bg-gradient-to-r from-[#D4A63D] via-[#D4A63D]/30 to-transparent" />
              </header>

              <div className="relative mt-6 min-h-0 flex-1">
                <div className="max-h-[58vh] overflow-y-auto pr-2 md:max-h-[60vh]">
                  <div className="max-w-[760px] space-y-5 text-[17px] leading-[1.7] text-stone-100 md:space-y-6 md:text-lg">
                    {paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#050505] to-transparent" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

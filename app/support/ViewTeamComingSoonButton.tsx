"use client";

import { useEffect, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export function ViewTeamComingSoonButton() {
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

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-amber-400 hover:bg-white/[0.04] sm:w-auto"
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      >
        View the Team
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          onMouseDown={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md border border-stone-800/80 bg-[#070707] p-7 text-center shadow-[0_28px_120px_rgba(0,0,0,0.75)] md:p-8"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-coming-soon-title"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-stone-700 text-stone-400 transition-colors hover:border-stone-400 hover:text-stone-100"
              aria-label="Close team coming soon popup"
            >
              x
            </button>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Team Directory
            </p>
            <h2
              id="team-coming-soon-title"
              className="mt-5 text-4xl font-bold uppercase leading-none text-stone-100"
              style={{ fontFamily: font.oswald }}
            >
              Coming Soon
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-stone-400">
              The missionary team directory is being prepared and will be available soon.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export type LightboxItem = {
  alt: string;
  caption: string;
  id: string;
  src: string | null;
};

export function VisionScreenshotLightbox({ items }: { items: LightboxItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;
  const active = isOpen ? items[openIndex] : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenIndex(null);
      } else if (event.key === "ArrowRight") {
        setOpenIndex((current) => (current === null ? current : (current + 1) % items.length));
      } else if (event.key === "ArrowLeft") {
        setOpenIndex((current) => (current === null ? current : (current - 1 + items.length) % items.length));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, items.length]);

  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {items.map((item, index) => (
          <button
            className="group relative aspect-[4/3] overflow-hidden border border-stone-800 bg-white/[0.02] text-left transition-colors hover:border-usam-gold/60"
            key={item.id}
            onClick={() => setOpenIndex(index)}
            type="button"
          >
            {item.src ? (
              <Image alt={item.alt} className="object-cover" fill sizes="(min-width: 640px) 33vw, 100vw" src={item.src} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_30%,rgba(194,161,78,0.12),transparent_60%)] px-4 text-center">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] text-usam-gold"
                  style={{ fontFamily: font.rajdhani }}
                >
                  Screenshot Needed
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <span
                className="text-[10px] uppercase tracking-[0.14em] text-white"
                style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
              >
                View
              </span>
            </div>
            <p
              className="absolute bottom-0 left-0 right-0 border-t border-stone-800 bg-usam-black/90 px-3 py-2 text-[11px] leading-tight text-stone-300 group-hover:opacity-0"
              style={{ fontFamily: font.rajdhani }}
            >
              {item.caption}
            </p>
          </button>
        ))}
      </div>

      {active ? (
        <div
          aria-labelledby="vision-lightbox-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm md:p-10"
          onMouseDown={() => setOpenIndex(null)}
          role="dialog"
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col border border-stone-800 bg-usam-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-stone-800 px-5 py-3.5">
              <span
                className="truncate text-sm font-semibold text-stone-200"
                id="vision-lightbox-title"
                style={{ fontFamily: font.oswald }}
              >
                {active.caption}
              </span>
              <button
                aria-label="Close screenshot viewer"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-stone-700 text-lg leading-none text-stone-400 transition-colors hover:border-usam-gold hover:text-usam-gold"
                onClick={() => setOpenIndex(null)}
                type="button"
              >
                &times;
              </button>
            </div>
            <div className="relative flex-1 bg-black">
              {active.src ? (
                <div className="relative h-[60vh] w-full">
                  <Image alt={active.alt} className="object-contain" fill sizes="90vw" src={active.src} />
                </div>
              ) : (
                <div className="flex h-[40vh] w-full flex-col items-center justify-center gap-3 px-8 text-center">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.22em] text-usam-gold"
                    style={{ fontFamily: font.rajdhani }}
                  >
                    Screenshot Needed
                  </span>
                  <p className="max-w-sm text-sm text-stone-400">{active.alt}</p>
                </div>
              )}
            </div>
            {items.length > 1 ? (
              <div className="flex items-center justify-between border-t border-stone-800 px-5 py-3">
                <button
                  className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-usam-gold"
                  onClick={() => setOpenIndex((current) => (current === null ? current : (current - 1 + items.length) % items.length))}
                  style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
                  type="button"
                >
                  ← Prev
                </button>
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-600" style={{ fontFamily: font.rajdhani }}>
                  {openIndex! + 1} / {items.length}
                </span>
                <button
                  className="text-[11px] uppercase tracking-[0.18em] text-stone-400 hover:text-usam-gold"
                  onClick={() => setOpenIndex((current) => (current === null ? current : (current + 1) % items.length))}
                  style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
                  type="button"
                >
                  Next →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

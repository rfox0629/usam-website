"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";

/**
 * Opens a sermon over the page rather than embedding a player in the flow. The
 * iframe only mounts while the dialog is open, so nothing loads from YouTube
 * until someone asks for it, and closing the dialog stops playback.
 */
export function SermonVideoLink({
  embedUrl,
  label,
  title,
  watchUrl,
}: {
  embedUrl: string;
  label: string;
  title: string;
  watchUrl: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setIsMounted(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [close, isOpen]);

  const dialog = isOpen && isMounted
    ? createPortal(
      <div
        aria-label={title}
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 md:p-8"
        onMouseDown={close}
        role="dialog"
      >
        <div className="w-full max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <p
              className="min-w-0 truncate text-[11px] uppercase tracking-[0.18em] text-white"
              style={{ fontFamily: morFont.rajdhani, fontWeight: 700 }}
            >
              {title}
            </p>
            <button
              aria-label="Close video"
              className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/35 text-white transition-colors hover:border-[#C2A14E]"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div
            className="relative w-full overflow-hidden rounded-lg"
            style={{ aspectRatio: "16 / 9", backgroundColor: "#000" }}
          >
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              referrerPolicy="strict-origin-when-cross-origin"
              src={`${embedUrl}?autoplay=1&rel=0`}
              title={title}
            />
          </div>

          <a
            className="mt-3 inline-block text-[13px] text-white/70 underline underline-offset-4 transition-colors hover:text-white"
            href={watchUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Watch on YouTube
          </a>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <button
        className="inline-flex min-h-[3.25rem] cursor-pointer items-center justify-center gap-2 border px-7 text-center text-xs uppercase tracking-[0.18em] transition-colors hover:border-[#C2A14E] md:px-9 md:text-[13px]"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        style={{
          borderColor: morColor.rule,
          color: morColor.ink,
          fontFamily: morFont.rajdhani,
          fontWeight: 700,
        }}
        type="button"
      >
        {label}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
      {dialog}
    </>
  );
}

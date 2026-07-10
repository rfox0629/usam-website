"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const sections = [
  { id: "overview", label: "The Vision", num: "01" },
  { id: "why", label: "Rationale", num: "02" },
  { id: "role", label: "Our Role", num: "03" },
  { id: "levels", label: "Framework", num: "04" },
  { id: "mor", label: "Case Study", num: "05" },
  { id: "takeon", label: "The Commitment", num: "06" },
  { id: "not-away", label: "The Guardrails", num: "07" },
  { id: "legal", label: "Structure", num: "08" },
  { id: "roadmap", label: "The Path", num: "09" },
  { id: "board", label: "Governance & Board", num: "10" },
  { id: "documents", label: "Due Diligence", num: "11" },
  { id: "stewardship", label: "Stewardship", num: "12" },
  { id: "faq", label: "Questions", num: "13" },
  { id: "contact", label: "Next Step", num: "14" },
] as const;

const TRACK_HEIGHT = 380;

export function PartnersSectionRail() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (draggingRef.current) {
          return;
        }

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = elements.indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const goToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    const el = document.getElementById(sections[clamped].id);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setActiveIndex(clamped);
  }, []);

  const indexFromPointerY = useCallback((clientY: number) => {
    const track = trackRef.current;

    if (!track) {
      return 0;
    }

    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return Math.round(ratio * (sections.length - 1));
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
      setActiveIndex(indexFromPointerY(event.clientY));
    },
    [indexFromPointerY],
  );

  useEffect(() => {
    if (!dragging) {
      return;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      setActiveIndex(indexFromPointerY(event.clientY));
    }

    function handleWindowPointerUp(event: PointerEvent) {
      setDragging(false);
      goToIndex(indexFromPointerY(event.clientY));
    }

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [dragging, goToIndex, indexFromPointerY]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        goToIndex(activeIndex - 1);
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        goToIndex(activeIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToIndex(sections.length - 1);
      }
    },
    [activeIndex, goToIndex],
  );

  const active = sections[activeIndex];
  const topPercent = (activeIndex / (sections.length - 1)) * 100;

  return (
    <nav aria-label="Section navigation" className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block xl:right-7">
      <div
        className="relative w-6"
        onPointerDown={handlePointerDown}
        ref={trackRef}
        style={{ cursor: dragging ? "grabbing" : "pointer", height: TRACK_HEIGHT, touchAction: "none" }}
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stone-800" />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-usam-gold/70 transition-[height] duration-150 ease-out"
          style={{ height: `${topPercent}%` }}
        />

        <button
          aria-label={`Current section: ${active.label}. Use arrow keys or drag to navigate.`}
          aria-valuemax={sections.length - 1}
          aria-valuemin={0}
          aria-valuenow={activeIndex}
          className="group absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 touch-none"
          onKeyDown={handleKeyDown}
          role="slider"
          style={{ top: `${topPercent}%`, cursor: dragging ? "grabbing" : "grab" }}
          type="button"
        >
          <span
            className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-sm border border-stone-800 bg-[rgba(13,13,13,0.95)] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-stone-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${
              dragging ? "opacity-100" : ""
            }`}
            style={{ fontFamily: font.rajdhani, fontWeight: 600 }}
          >
            {active.num} · {active.label}
          </span>
          <span
            className={`block rounded-full border-2 border-usam-gold bg-usam-gold shadow-[0_0_0_4px_rgba(13,13,13,0.9)] transition-transform duration-150 ${
              dragging ? "h-4 w-4" : "h-3 w-3 group-hover:scale-110"
            }`}
          />
        </button>
      </div>
    </nav>
  );
}

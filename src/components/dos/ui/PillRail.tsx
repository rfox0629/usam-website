"use client";

import { useEffect, useRef, useState } from "react";

export type PillRailOption<T extends string> = { label: string; value: T };

/**
 * Scrollable pill tab rail (canonical spec §3, V10 treatment A).
 *
 * 36px pills, 15px horizontal padding, 6px gap, 13.5/600 ink labels on white
 * with a hairline; the active pill is filled blue with white text. The rail is
 * a native horizontal scroll view: no arrows, no truncation, no dropdown. The
 * selected pill scrolls fully into view on switch and a right-edge fade shows
 * there is more. Every pill has a 44px hit area (`h-11` button around the
 * 36px visual) and the rail is a `tablist`.
 */
export function PillRail<T extends string>({
  edgeInset = 5,
  label,
  onChange,
  options,
  value,
}: {
  /** The page's horizontal padding the rail bleeds into so pills scroll edge to edge: 5 (20px, spec pages) or 4 (16px, the current app container). */
  edgeInset?: 4 | 5;
  /** Accessible name for the rail, e.g. "My Record sections". */
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<PillRailOption<T>>;
  value: T;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  /* The right-edge fade only means something when the rail actually scrolls;
     on a short rail (two or three pills) it would paint a white strip over
     whatever ground the page has. */
  const [hasOverflow, setHasOverflow] = useState(false);

  /* Keep the selected pill fully visible by scrolling the rail itself,
     horizontally only. The browser's scroll-into-view helper also scrolls
     ancestors vertically, which moved the page when a tab was switched
     (found by the Phase 8 visual run). */
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('[aria-selected="true"]');

    if (!rail || !active) {
      return;
    }

    const railRect = rail.getBoundingClientRect();
    const pillRect = active.getBoundingClientRect();
    const inset = 16;

    if (pillRect.left < railRect.left + inset) {
      rail.scrollBy({ left: pillRect.left - railRect.left - inset });
    } else if (pillRect.right > railRect.right - inset) {
      rail.scrollBy({ left: pillRect.right - railRect.right + inset });
    }
  }, [value]);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return undefined;
    }

    const measure = () => setHasOverflow(rail.scrollWidth > rail.clientWidth + 1);

    measure();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(rail);

    return () => observer.disconnect();
  }, [options.length]);

  return (
    <div className={`relative ${edgeInset === 4 ? "-mx-4" : "-mx-5"}`}>
      <div
        aria-label={label}
        className={`flex gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${edgeInset === 4 ? "px-4" : "px-5"}`}
        ref={railRef}
        role="tablist"
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              aria-selected={selected}
              className="group flex h-11 shrink-0 items-center rounded-dos-3 focus:outline-none"
              key={option.value}
              onClick={() => onChange(option.value)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span
                className={`flex h-9 items-center rounded-dos-3 border px-[15px] text-dos-label transition-colors group-focus-visible:ring-2 group-focus-visible:ring-dos-blue group-focus-visible:ring-offset-2 ${
                  selected ? "border-dos-blue bg-dos-blue text-white" : "border-dos-line bg-white text-dos-primary group-hover:border-dos-blue100"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      {hasOverflow ? <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" /> : null}
    </div>
  );
}

/**
 * Segmented control for two or three exclusive views inside content
 * (month / week): a surface-2 track with 4px padding; the active segment is a
 * white pill.
 */
export function Segmented<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<PillRailOption<T>>;
  value: T;
}) {
  return (
    <div aria-label={label} className="flex rounded-dos-3 bg-dos-surface2 p-1" role="group">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-pressed={selected}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center rounded-dos-3 px-3 text-dos-label transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue ${
              selected ? "bg-white text-dos-primary shadow-dos-float" : "text-dos-secondary hover:text-dos-primary"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Status pill (canonical spec §3): 20px, pill radius, 12/600. Status is never
 * coloured text; it is one of these. Not a control.
 *
 *   grey   neutral, logged
 *   blue   scheduled
 *   amber  overdue, due soon, testing, pending
 *   green  on track, confirmed, answered
 *   red    error
 */
export type StatusTone = "grey" | "blue" | "amber" | "green" | "red";

const toneClass: Record<StatusTone, string> = {
  grey: "bg-dos-surface2 text-dos-secondary",
  blue: "bg-dos-blue50 text-dos-blueText",
  amber: "bg-dos-amberBg text-dos-amber",
  green: "bg-dos-greenBg text-dos-green",
  red: "bg-dos-redBg text-dos-red",
};

export function StatusPill({ children, tone = "grey" }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span className={`inline-flex h-5 max-w-[100px] shrink-0 items-center truncate rounded-dos-3 px-2 text-dos-pill ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

/** Initials avatar; `overdue` adds the amber ring used on Field rows. */
export function Avatar({
  imageUrl,
  name,
  overdue = false,
  size = "md",
}: {
  imageUrl?: string | null;
  name: string;
  overdue?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dimension = { sm: "h-9 w-9 text-dos-pill", md: "h-11 w-11 text-dos-label", lg: "h-[52px] w-[52px] text-dos-question" }[size];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-dos-3 bg-dos-blue50 font-semibold text-dos-blueText ${dimension} ${
        overdue ? "ring-2 ring-dos-amber" : ""
      }`}
    >
      {imageUrl ? <img alt="" className="h-full w-full object-cover" src={imageUrl} /> : initials}
    </span>
  );
}

/** 38px icon tile for rows (meetings timeline, Person "Right now"). */
export function IconTile({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-dos-1 bg-dos-blue50 text-dos-blue ${size === "sm" ? "h-[30px] w-[30px]" : "h-[38px] w-[38px]"}`}
    >
      {children}
    </span>
  );
}

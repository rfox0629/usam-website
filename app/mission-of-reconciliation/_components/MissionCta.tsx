import Link from "next/link";
import type { ReactNode } from "react";
import { morColor, morFont } from "@/src/lib/mission-of-reconciliation/brand";

const baseClassName = "inline-flex min-h-[3.25rem] items-center justify-center px-7 text-center text-xs uppercase tracking-[0.18em] transition-colors md:px-9 md:text-[13px]";

/**
 * JoinMissionInterestModal only forwards a className to its trigger button (it
 * sets font family and weight inline itself), so the outline treatment has to be
 * expressed entirely in Tailwind classes rather than the shared style objects.
 */
export const morTriggerClassName = `${baseClassName} cursor-pointer border border-[#E4DDCE] text-[#15120C] hover:border-[#C2A14E]`;

/** Same trigger, on the deep band. */
export const morTriggerOnDarkClassName = `${baseClassName} cursor-pointer border border-white/35 text-white hover:border-[#C2A14E]`;

export function primaryCtaStyle() {
  return {
    backgroundColor: morColor.gold,
    color: morColor.ink,
    fontFamily: morFont.rajdhani,
    fontWeight: 700,
  } as const;
}

export function secondaryCtaStyle({ onDark = false }: { onDark?: boolean } = {}) {
  return {
    borderColor: onDark ? "rgba(255,255,255,0.35)" : morColor.rule,
    color: onDark ? "#FFFFFF" : morColor.ink,
    fontFamily: morFont.rajdhani,
    fontWeight: 700,
  } as const;
}

/** Gold call to action. Every one of these leads to the restoration intake. */
export function PrimaryCta({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link className={baseClassName} href={href} style={primaryCtaStyle()}>
      {children}
    </Link>
  );
}

export function SecondaryCta({
  children,
  href,
  onDark = false,
}: {
  children: ReactNode;
  href: string;
  onDark?: boolean;
}) {
  return (
    <Link className={`${baseClassName} border`} href={href} style={secondaryCtaStyle({ onDark })}>
      {children}
    </Link>
  );
}

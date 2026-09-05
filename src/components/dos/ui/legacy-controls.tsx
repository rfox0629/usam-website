"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/src/components/dos/Icon";

/* Legacy DOS controls, moved verbatim from app/dos/app/DosMvpAppClient.tsx in
 * USA-213 so screens keep rendering exactly what they render today while the
 * spec §3 controls in ./Button.tsx, ./PageHeader.tsx and ./Row.tsx are adopted
 * screen by screen. `font` carries the same values the client uses. */
const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

export type ButtonTone = "black" | "soft" | "white";

export function AppButton({
  children,
  disabled,
  icon,
  onClick,
  tone = "white",
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
}) {
  const toneClass = {
    black: "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:brightness-[0.98]",
    soft: "border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:bg-white",
    white: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#BFDBFE]",
  }[tone];
  const sizeClass = tone === "black" ? "min-h-[54px] text-[15px]" : "min-h-11 text-xs sm:text-sm";

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

export function CompactButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-dos-3 border border-dos-line bg-white px-3 text-dos-label text-dos-primary transition-colors hover:border-dos-blue100 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue max-[350px]:px-2"
      onClick={onClick}
      type="button"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

export function TabPageHeader({
  action,
  back,
  title,
}: {
  /** Trailing control (right-aligned in the control row). */
  action?: ReactNode;
  /** The back control (left of the control row), usually <MoreBackButton />. */
  back?: ReactNode;
  title: string;
}) {
  /* USA-229: the canonical PageHeader grammar (spec §3): a 44px control row
     with the back control on the left and any trailing control on the right,
     then the title in the display size. */
  return (
    <header className="pt-2">
      {back || action ? (
        <div className="flex min-h-11 items-center justify-between gap-3">
          {back ?? <span />}
          {action ? <div className="ml-auto shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <h1 className={`text-dos-display text-dos-primary ${back || action ? "mt-1" : ""}`}>{title}</h1>
    </header>
  );
}

export function SectionHeading({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  /* USA-229: the canonical section eyebrow (spec §3 Eyebrow, blue). */
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-dos-eyebrow uppercase text-dos-eyebrowSection">{title}</h2>
      {action}
    </div>
  );
}

export function MoreBackButton({ label = "Back to More", onClick }: { label?: string; onClick: () => void }) {
  /* USA-229: the "← More" pill is retired (spec §10); this is the canonical
     44px back control. */
  return (
    <button
      aria-label={label}
      className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-dos-3 text-dos-primary transition-colors hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}

export function UserProfileAvatar({
  imageUrl,
  name,
  size = "sm",
}: {
  imageUrl?: string | null;
  name: string;
  size?: "lg" | "sm";
}) {
  const dimension = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  if (imageUrl) {
    return (
      <span className={`${dimension} flex shrink-0 overflow-hidden rounded-full border border-[#BFDBFE] bg-[#EBF2FF] shadow-[0_10px_24px_rgba(37,99,235,0.10)]`}>
        <img alt="" className="h-full w-full object-cover" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]`}>
      {initial}
    </span>
  );
}

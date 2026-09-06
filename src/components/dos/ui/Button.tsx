import type { ReactNode } from "react";
import { Icon, type IconName } from "@/src/components/dos/Icon";

/**
 * DOS button (canonical spec §3). 48px, pill radius, 15/600.
 *
 *   primary    blue fill, white text — one per section
 *   tinted     blue-50 fill, blue text — the "valid but not yet" state and quiet CTAs
 *   secondary  white, hairline
 *   text       blue text only
 *   danger     red text only; never a red fill
 *
 * `compact` renders the 36px variant used inside rows and headers.
 */
export type ButtonVariant = "primary" | "tinted" | "secondary" | "text" | "danger";

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-dos-blue text-white hover:bg-dos-blueText disabled:bg-dos-surface2 disabled:text-dos-disabled",
  tinted: "bg-dos-blue50 text-dos-blueText hover:bg-dos-blue100 disabled:bg-dos-surface2 disabled:text-dos-disabled",
  secondary: "border border-dos-line bg-white text-dos-primary hover:border-dos-blue100 disabled:text-dos-disabled",
  text: "text-dos-blueText hover:bg-dos-blue50 disabled:text-dos-disabled",
  danger: "text-dos-red hover:bg-dos-redBg disabled:text-dos-disabled",
};

export function Button({
  ariaLabel,
  children,
  compact = false,
  disabled = false,
  fullWidth = false,
  icon,
  onClick,
  type = "button",
  variant = "secondary",
}: {
  ariaLabel?: string;
  children: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={[
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-dos-3 font-semibold transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        compact ? "h-9 px-3.5 text-dos-label" : "h-12 px-[18px] text-dos-body",
        fullWidth ? "w-full" : "",
        variantClass[variant],
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon ? <Icon name={icon} size={compact ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

"use client";

import { Minus, Plus, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * DOS form primitives (canonical spec §3, USA-211).
 *
 * These implement the approved Log Meeting / Schedule Meeting / Add Person
 * form grammar so every form can share one set of controls instead of
 * re-drawing fields, chips, steppers, and sticky actions per screen. They are
 * additive: nothing adopts them until its own pilot or batch issue.
 *
 * Two rules they exist to keep:
 *
 *   1. The unsaved-work guard reads dirtiness from the rendered controls
 *      (inputs, selects, checkboxes, and `aria-pressed` buttons). Every
 *      primitive that holds a value therefore renders a real form control or
 *      an `aria-pressed` button, so a form built from these is protected
 *      without any per-form wiring (B7).
 *
 *   2. The sticky primary never disables for validation. When the form is
 *      invalid it turns tinted, names how many things to fix, and lets the
 *      caller scroll to the first error. It is disabled only while saving, so
 *      a double submit cannot happen.
 */

/* ---------------------------------------------------------------- helper */

export function HelperLine({
  children,
  id,
  tone = "default",
}: {
  children: ReactNode;
  id?: string;
  tone?: "default" | "error";
}) {
  return (
    <p
      className={`mt-1.5 text-dos-meta ${tone === "error" ? "text-dos-red" : "text-dos-secondary"}`}
      id={id}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}

/* ----------------------------------------------------------------- field */

/** 48px control classes (44px when `compact`); error replaces the hairline with the red ring. */
export function fieldControlClass({ compact = false, error = false }: { compact?: boolean; error?: boolean } = {}) {
  return [
    compact ? "min-h-11" : "min-h-12",
    "w-full rounded-dos-1 border bg-white px-3.5 text-dos-body text-dos-primary outline-none transition-[border-color,box-shadow]",
    "placeholder:text-dos-secondary",
    "focus-visible:border-dos-blue focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-offset-2",
    error ? "border-dos-red ring-2 ring-dos-redBg" : "border-dos-line",
  ].join(" ");
}

/**
 * Label + control + one helper line. Required shows a red asterisk after the
 * label; optional shows the word "optional" on the right; an error replaces
 * the helper with a red instruction that says what to do.
 */
export function Field({
  children,
  error,
  helper,
  hint,
  htmlFor,
  id,
  label,
  optional = false,
  required = false,
}: {
  children: ReactNode;
  /** Red instruction shown instead of the helper. */
  error?: string | null;
  helper?: string;
  /** Extra right-aligned hint, e.g. "15-minute steps". */
  hint?: string;
  htmlFor?: string;
  id?: string;
  label: ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  const helperId = id ? `${id}-helper` : undefined;

  return (
    <div className="min-w-0" data-dos-field={error ? "invalid" : "valid"}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-dos-label text-dos-secondary" htmlFor={htmlFor}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-dos-red">
              *
            </span>
          ) : null}
        </label>
        {optional || hint ? (
          <span className="shrink-0 text-dos-meta text-dos-secondary">{optional ? "optional" : hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <HelperLine id={helperId} tone="error">
          {error}
        </HelperLine>
      ) : helper ? (
        <HelperLine id={helperId}>{helper}</HelperLine>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- stepper */

/**
 * − value + with fixed steps and no ceiling. A threshold (for example "past
 * 4h, confirm") is the caller's decision, so the stepper never caps the value.
 * The value is mirrored into a hidden input so FormData and the unsaved-work
 * guard both see it.
 */
export function Stepper({
  decrementLabel = "Decrease",
  format,
  incrementLabel = "Increase",
  label,
  min = 0,
  name,
  onChange,
  step,
  value,
}: {
  decrementLabel?: string;
  /** Renders the value for people; defaults to the raw number. */
  format?: (value: number) => string;
  incrementLabel?: string;
  /** Accessible name for the value, e.g. "Duration". */
  label: string;
  min?: number;
  name?: string;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  const display = format ? format(value) : String(value);
  const canDecrement = value - step >= min;

  return (
    <div className="inline-flex h-12 items-center rounded-dos-3 border border-dos-line bg-white" role="group" aria-label={label}>
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button
        aria-label={decrementLabel}
        className="flex h-11 w-11 items-center justify-center rounded-dos-3 text-dos-primary transition-colors hover:bg-dos-surface2 disabled:text-dos-disabled"
        disabled={!canDecrement}
        onClick={() => onChange(Math.max(min, value - step))}
        type="button"
      >
        <Minus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      </button>
      <span aria-live="polite" className="min-w-[4.5rem] text-center text-dos-body font-semibold text-dos-primary">
        {display}
      </span>
      <button
        aria-label={incrementLabel}
        className="flex h-11 w-11 items-center justify-center rounded-dos-3 text-dos-primary transition-colors hover:bg-dos-surface2"
        onClick={() => onChange(value + step)}
        type="button"
      >
        <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- chips */

/**
 * A 36px chip. `selected` renders the blue tint; `onRemove` adds the ✕ for
 * attendee-style chips. Long labels truncate at ~190px, so a helper line
 * should carry the count when several are selected. `aria-pressed` is what
 * the unsaved-work guard reads.
 */
export function Chip({
  children,
  onRemove,
  onSelect,
  removeLabel,
  selected = false,
}: {
  children: ReactNode;
  onRemove?: () => void;
  onSelect?: () => void;
  removeLabel?: string;
  selected?: boolean;
}) {
  const surface = selected
    ? "border-dos-blue bg-dos-blue50 text-dos-blueText"
    : "border-dos-line bg-white text-dos-primary hover:border-dos-blue100";

  return (
    <span className={`inline-flex h-9 max-w-[190px] items-center rounded-dos-3 border text-dos-label ${surface}`}>
      <button
        aria-pressed={selected}
        className="flex h-full min-w-0 items-center px-3.5 disabled:cursor-default"
        disabled={!onSelect}
        onClick={onSelect}
        type="button"
      >
        <span className="truncate">{children}</span>
      </button>
      {onRemove ? (
        <button
          aria-label={removeLabel ?? "Remove"}
          className="-ml-1 flex h-full w-9 shrink-0 items-center justify-center rounded-r-dos-3"
          onClick={onRemove}
          type="button"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </span>
  );
}

export function ChipGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div aria-label={label} className="flex flex-wrap gap-2" role="group">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ toggle row */

/**
 * A boolean with a consequence: label, one-line consequence, switch. Backed by
 * a real checkbox so FormData and the unsaved-work guard see it; the whole
 * row is the tap target.
 */
export function ToggleRow({
  checked,
  consequence,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  consequence?: string;
  label: string;
  name?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-t border-dos-line py-3 first:border-t-0">
      <span className="min-w-0">
        <span className="block text-dos-body font-semibold text-dos-primary">{label}</span>
        {consequence ? <span className="mt-0.5 block text-dos-meta text-dos-secondary">{consequence}</span> : null}
      </span>
      <span className="relative flex h-11 w-14 shrink-0 items-center justify-end">
        <input
          checked={checked}
          className="peer sr-only"
          name={name}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span
          aria-hidden="true"
          className="flex h-7 w-12 items-center rounded-dos-3 bg-dos-line p-0.5 transition-colors peer-checked:bg-dos-blue peer-focus-visible:ring-2 peer-focus-visible:ring-dos-blue peer-focus-visible:ring-offset-2"
        >
          <span className={`h-6 w-6 rounded-dos-3 bg-white shadow-dos-float transition-transform ${checked ? "translate-x-5" : ""}`} />
        </span>
      </span>
    </label>
  );
}

/* --------------------------------------------------------- sticky action */

/**
 * The one sticky primary on a task screen. Never disabled for validation:
 * when `invalidCount` is above zero it turns tinted and reads "Fix N things
 * to <verb>", and a tap calls `onInvalidClick` (the caller scrolls to the
 * first error). While saving it shows a spinner and `savingLabel`, and it is
 * disabled only then.
 */
export function StickyPrimary({
  children,
  invalidCount = 0,
  isSaving = false,
  onClick,
  onInvalidClick,
  savingLabel = "Saving…",
  type = "submit",
}: {
  children: string;
  invalidCount?: number;
  isSaving?: boolean;
  onClick?: () => void;
  onInvalidClick?: () => void;
  savingLabel?: string;
  type?: "button" | "submit";
}) {
  const invalid = invalidCount > 0;
  const verb = children.charAt(0).toLowerCase() + children.slice(1);
  const label = isSaving
    ? savingLabel
    : invalid
      ? `Fix ${invalidCount} ${invalidCount === 1 ? "thing" : "things"} to ${verb}`
      : children;

  return (
    <div className="sticky bottom-0 z-dos-sticky -mx-5 bg-gradient-to-t from-white via-white/95 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-4">
      <button
        aria-busy={isSaving || undefined}
        aria-live="polite"
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-dos-3 px-4 text-dos-body font-semibold transition-colors ${
          invalid ? "bg-dos-blue50 text-dos-blueText" : "bg-dos-blue text-white hover:bg-dos-blueText"
        } disabled:cursor-progress`}
        disabled={isSaving}
        onClick={invalid ? onInvalidClick : onClick}
        type={invalid ? "button" : type}
      >
        {isSaving ? (
          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-dos-3 border-2 border-white/40 border-t-white" />
        ) : null}
        {label}
      </button>
    </div>
  );
}

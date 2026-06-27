"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export const publicInputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15 md:text-sm";

export const publicSelectClassName =
  "min-h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 pr-11 text-base text-stone-950 shadow-sm outline-none transition focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15 md:text-sm";

export const publicTextareaClassName =
  "mt-2 min-h-28 w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15 md:text-sm";

export function PublicFormShell({
  children,
  className = "",
  size = "standard",
}: {
  children: ReactNode;
  className?: string;
  size?: "compact" | "standard" | "wide";
}) {
  const maxWidth = size === "compact" ? "max-w-[640px]" : size === "wide" ? "max-w-[840px]" : "max-w-[760px]";

  return (
    <div className={`mx-auto w-full ${maxWidth} rounded-[28px] border border-stone-200 bg-usam-white p-4 shadow-[0_28px_90px_rgba(12,10,9,0.28)] md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PublicFormHeader({
  eyebrow,
  note,
  title,
  description,
}: {
  description?: ReactNode;
  eyebrow?: ReactNode;
  note?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="max-w-[820px] px-1 pb-1 pr-12 pt-0 md:px-2 md:pr-14">
      {eyebrow ? (
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#0D0D0D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[720px] text-[15px] leading-[1.65] text-stone-800 md:mt-4 md:text-[17px] md:leading-[1.62]">
          {description}
        </p>
      ) : null}
      {note ? (
        <p className="mt-4 inline-block max-w-[820px] rounded-2xl border border-[#C2A14E]/45 bg-usam-gold/10 px-4 py-3 text-[14px] leading-[1.62] text-stone-800 md:px-[18px] md:py-[14px] md:text-[15px] md:leading-[1.58]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function PublicFormSection({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-stone-900" style={{ fontFamily: font.rajdhani }}>
        {title}
      </h3>
      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

export function PublicFormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {children}
    </div>
  );
}

export function PublicFieldLabel({
  children,
  htmlFor,
  required = false,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  const labelClassName = "text-[11px] uppercase tracking-[0.15em] text-stone-700";
  const content = (
    <>
      {children}
      {required ? <span className="ml-1 text-[#0D0D0D]">*</span> : null}
    </>
  );

  if (!htmlFor) {
    return (
      <span className={labelClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {content}
      </span>
    );
  }

  return (
    <label htmlFor={htmlFor} className={labelClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {content}
    </label>
  );
}

export function PublicTextInput({
  autoComplete,
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  autoComplete?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <PublicFieldLabel htmlFor={name} required={required}>{label}</PublicFieldLabel>
      <input
        autoComplete={autoComplete}
        className={publicInputClassName}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

export function PublicTextarea({
  label,
  name,
  placeholder,
  required = false,
  rows = 4,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <PublicFieldLabel htmlFor={name} required={required}>{label}</PublicFieldLabel>
      <textarea
        className={publicTextareaClassName}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    </div>
  );
}

export function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

type OptionElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  title?: string;
  value?: number | string;
};

function optionText(value: ReactNode) {
  return Children.toArray(value).join("");
}

export function PublicSelect({
  children,
  defaultValue,
  label,
  name,
  onChange,
  required = false,
  tone = "light",
  value,
}: {
  children: ReactNode;
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  tone?: "dark" | "light";
  value?: string;
}) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo(() => {
    return Children.toArray(children).flatMap((child) => {
      if (!isValidElement<OptionElementProps>(child) || child.props.value === undefined) {
        return [];
      }

      return [{
        disabled: Boolean(child.props.disabled),
        label: optionText(child.props.children) || String(child.props.value),
        title: child.props.title,
        value: String(child.props.value),
      }];
    });
  }, [children]);
  const initialValue = defaultValue ?? options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
  const selectedLabel = selectedOption?.label ?? "Select";
  const firstOptionValue = options[0]?.value ?? "";
  const optionValuesKey = options.map((option) => option.value).join("|");
  const buttonClassName = tone === "dark"
    ? "min-h-11 w-full rounded-xl border border-stone-800 bg-[#0D0D0D] px-3 text-left text-sm text-stone-100 shadow-sm outline-none transition-colors hover:border-[#C2A14E]/70 focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/10"
    : "min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-left text-base text-stone-950 shadow-sm outline-none transition hover:border-[#C2A14E]/65 focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15 md:text-sm";
  const menuClassName = tone === "dark"
    ? "absolute left-0 right-0 top-[calc(100%+8px)] z-[120] overflow-hidden rounded-2xl border border-stone-700 bg-[#0D0D0D] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    : "absolute left-0 right-0 top-[calc(100%+8px)] z-[120] overflow-hidden rounded-2xl border border-[#C2A14E]/40 bg-white p-2 shadow-[0_24px_60px_rgba(28,25,23,0.18)]";
  const optionClassName = (isSelected: boolean, disabled: boolean) => tone === "dark"
    ? `flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-sm transition-colors ${isSelected ? "bg-[#C2A14E]/18 text-[#F1D37A]" : "text-stone-100 hover:bg-white/[0.07]"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`
    : `flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition-colors ${isSelected ? "bg-[#C2A14E]/16 text-stone-950" : "text-stone-800 hover:bg-stone-50"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`;

  useEffect(() => {
    if (value !== undefined) {
      return;
    }

    setInternalValue((currentValue) => {
      if (currentValue && options.some((option) => option.value === currentValue)) {
        return currentValue;
      }

      return defaultValue ?? firstOptionValue;
    });
  }, [defaultValue, firstOptionValue, optionValuesKey, options, value]);

  function chooseOption(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  const labelClassName = tone === "dark"
    ? "text-[10px] uppercase tracking-[0.18em] text-stone-400"
    : "text-[11px] uppercase tracking-[0.15em] text-stone-700";

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <label htmlFor={`${name}-button`} className={labelClassName} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
        {required ? <span className="ml-1 text-[#C2A14E]">*</span> : null}
      </label>
      <input name={name} readOnly type="hidden" value={selectedOption?.value ?? ""} />
      <div className="relative mt-2">
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={required}
          className={`${buttonClassName} flex items-center justify-between gap-3`}
          id={`${name}-button`}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <span className={`truncate ${selectedOption?.value ? "" : tone === "dark" ? "text-stone-500" : "text-stone-500"}`}>
            {selectedLabel}
          </span>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${tone === "dark" ? "border-stone-700 text-[#C2A14E]" : "border-stone-200 bg-stone-50 text-[#8F7431]"} ${isOpen ? "rotate-180" : ""}`}>
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </span>
        </button>
        {isOpen ? (
          <div className={menuClassName} id={listboxId} role="listbox">
            <div className="max-h-64 overflow-y-auto pr-1">
              {options.map((option) => {
                const isSelected = option.value === selectedValue;

                return (
                  <button
                    aria-selected={isSelected}
                    className={optionClassName(isSelected, option.disabled)}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => chooseOption(option.value)}
                    role="option"
                    title={option.title}
                    type="button"
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <span className={`ml-3 h-2.5 w-2.5 shrink-0 rounded-full ${tone === "dark" ? "bg-[#C2A14E]" : "bg-[#C2A14E]"}`} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PublicCheckbox({
  children,
  name,
  required = false,
  value = "on",
}: {
  children: ReactNode;
  name: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="flex min-h-12 items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 transition-colors hover:border-[#C2A14E]/55">
      <input className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]" name={name} required={required} type="checkbox" value={value} />
      <span>{children}</span>
    </label>
  );
}

export function PublicSubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-[54px] w-full items-center justify-center rounded-xl border border-usam-black bg-usam-black px-7 py-4 text-center text-xs uppercase leading-5 tracking-[0.22em] text-usam-white shadow-sm transition-all duration-300 hover:bg-usam-black/90 hover:shadow-[0_14px_34px_rgba(13,13,13,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      type="submit"
    >
      {children}
    </button>
  );
}

export function PublicFormMessage({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  const toneClassName = tone === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-usam-success/25 bg-usam-success/10 text-usam-success";

  return (
    <div className={`rounded-2xl border p-5 text-sm leading-7 shadow-sm ${toneClassName}`}>
      {children}
    </div>
  );
}

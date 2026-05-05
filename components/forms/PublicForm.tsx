import type { ReactNode } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export const publicInputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";

export const publicSelectClassName =
  "min-h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 pr-11 text-base text-stone-950 shadow-sm outline-none transition focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";

export const publicTextareaClassName =
  "mt-2 min-h-28 w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";

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
    <div className={`mx-auto w-full ${maxWidth} rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-4 shadow-[0_28px_90px_rgba(12,10,9,0.28)] md:p-6 ${className}`}>
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
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
        <p className="mt-4 inline-block max-w-[820px] rounded-2xl border border-[#e2b84e]/45 bg-[#fff3cf] px-4 py-3 text-[14px] leading-[1.62] text-stone-800 md:px-[18px] md:py-[14px] md:text-[15px] md:leading-[1.58]">
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
      {required ? <span className="ml-1 text-[#9a6b12]">*</span> : null}
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

export function PublicSelect({
  children,
  label,
  name,
  required = false,
}: {
  children: ReactNode;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div>
      <PublicFieldLabel htmlFor={name} required={required}>{label}</PublicFieldLabel>
      <div className="relative mt-2">
        <select className={publicSelectClassName} id={name} name={name} required={required}>
          {children}
        </select>
        <SelectChevron />
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
    <label className="flex min-h-12 items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 transition-colors hover:border-[#D4A63D]/55">
      <input className="mt-1 h-4 w-4 shrink-0 accent-[#D4A63D]" name={name} required={required} type="checkbox" value={value} />
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
      className="inline-flex min-h-[54px] w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-7 py-4 text-center text-xs uppercase leading-5 tracking-[0.22em] text-stone-950 shadow-sm transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_14px_34px_rgba(212,166,61,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
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
    : "border-emerald-200 bg-emerald-50 text-emerald-950";

  return (
    <div className={`rounded-2xl border p-5 text-sm leading-7 shadow-sm ${toneClassName}`}>
      {children}
    </div>
  );
}

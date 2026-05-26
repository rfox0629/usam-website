"use client";

import { useState } from "react";

type PasswordVisibilityInputProps = {
  autoComplete?: string;
  className: string;
  defaultValue?: string;
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
};

export function PasswordVisibilityInput({
  autoComplete = "off",
  className,
  defaultValue = "",
  id,
  name,
  placeholder,
  required = false,
}: PasswordVisibilityInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        autoComplete={autoComplete}
        className={`${className} mt-0 pr-24`}
        defaultValue={defaultValue}
        id={id}
        name={name}
        placeholder={placeholder}
        required={required}
        type={isVisible ? "text" : "password"}
      />
      <button
        aria-label={isVisible ? "Hide access code" : "Show access code"}
        aria-pressed={isVisible}
        className="absolute right-2 top-1/2 flex h-8 -translate-y-1/2 items-center justify-center rounded-md border border-[#D4A63D]/45 bg-[#D4A63D]/10 px-3 text-[10px] uppercase tracking-[0.14em] text-[#F5B942] transition-colors hover:border-[#D4A63D] hover:bg-[#D4A63D]/20 focus:outline-none focus:ring-2 focus:ring-[#D4A63D]/35"
        onClick={() => setIsVisible((current) => !current)}
        style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}
        type="button"
      >
        {isVisible ? "Hide" : "Preview"}
      </button>
    </div>
  );
}

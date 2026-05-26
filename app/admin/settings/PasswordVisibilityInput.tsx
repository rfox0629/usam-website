"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative mt-2">
      <input
        autoComplete={autoComplete}
        className={`${className} mt-0 pr-12`}
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
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-stone-800 text-stone-400 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942] focus:outline-none focus:ring-2 focus:ring-[#D4A63D]/35"
        onClick={() => setIsVisible((current) => !current)}
        type="button"
      >
        <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

/* The DOS phone convention: store national digits, show (651) 456-8974. */

export function phoneDigitsOnly(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits.slice(0, 10);
}

export function formatPhoneNumber(value: string | null | undefined) {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

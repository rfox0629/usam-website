"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getGivingUrl } from "@/src/lib/giving";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export type CommitmentGiftType = "monthly" | "onetime";
export type SupportCommitmentSource = "missionary_profile" | "general_support_page";

export type GivingCommitmentFormProps = {
  defaultAllocation?: string | null;
  displayMode?: "section" | "modal";
  householdId?: string | null;
  householdName?: string | null;
  initialGiftType?: CommitmentGiftType;
  profileSlug?: string | null;
  resolvedMonthlyGivingUrl?: string | null;
  resolvedOneTimeGivingUrl?: string | null;
  source?: SupportCommitmentSource;
  supportExplanation?: string;
  supportMode?: string;
  supportTargetFund?: string | null;
  supportTargetHouseholdName?: string | null;
};

const giftTypeOptions: readonly { label: string; value: CommitmentGiftType }[] = [
  { label: "Monthly", value: "monthly" },
  { label: "One Time", value: "onetime" },
] as const;

const monthlyAmounts = [
  { label: "$50", value: "50" },
  { label: "$100", value: "100" },
  { label: "$200", value: "200" },
  { label: "$500", value: "500" },
  { label: "Other", value: "Other" },
] as const;

const oneTimeAmounts = [
  { label: "$100", value: "100" },
  { label: "$250", value: "250" },
  { label: "$500", value: "500" },
  { label: "$1,000", value: "1000" },
  { label: "Other", value: "Other" },
] as const;

const baseAllocationPreferences = [
  "Support this missionary",
  "Support the General Mission Fund",
  "Help fund missionaries in need",
  "State or regional leadership",
  "National expansion",
  "Unsure",
] as const;

const inputClassName = "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";
const selectClassName = "min-h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 pr-11 text-base text-stone-950 shadow-sm outline-none transition focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";
const textareaClassName = "mt-2 min-h-24 w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-base leading-6 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";

function parseAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] uppercase tracking-[0.15em] text-stone-700"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="text-[12px] font-bold uppercase tracking-[0.16em] text-stone-900"
      style={{ fontFamily: font.rajdhani }}
    >
      {children}
    </h3>
  );
}

function SelectChevron() {
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

function SelectField({
  children,
  id,
  label,
  name,
  onChange,
  required = true,
  value,
}: {
  children: ReactNode;
  id: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  value?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative mt-2">
        <select
          className={selectClassName}
          id={id}
          name={name}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          required={required}
          value={value}
        >
          {children}
        </select>
        <SelectChevron />
      </div>
    </div>
  );
}

export function GivingCommitmentForm({
  defaultAllocation,
  displayMode = "section",
  householdId = null,
  householdName,
  initialGiftType = "monthly",
  profileSlug = null,
  resolvedMonthlyGivingUrl,
  resolvedOneTimeGivingUrl,
  source = "missionary_profile",
  supportExplanation,
  supportMode = "household",
  supportTargetFund,
  supportTargetHouseholdName,
}: GivingCommitmentFormProps) {
  const contextName = householdName?.trim() || "USA Missionaries";
  const fallbackAllocation = source === "general_support_page"
    ? "Support the General Mission Fund"
    : supportMode === "household"
      ? "Support this missionary"
      : "Support the General Mission Fund";
  const allocationLabel = defaultAllocation?.trim() || fallbackAllocation;
  const allocationPreferences = useMemo(() => {
    return baseAllocationPreferences.includes(allocationLabel as typeof baseAllocationPreferences[number])
      ? [...baseAllocationPreferences]
      : [allocationLabel, ...baseAllocationPreferences];
  }, [allocationLabel]);

  const [giftType, setGiftType] = useState<CommitmentGiftType>(initialGiftType);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [allocationPreference, setAllocationPreference] = useState(allocationLabel);
  const [status, setStatus] = useState<"error" | "idle" | "submitting" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const redirectStarted = useRef(false);
  const redirectUrl = useRef(getGivingUrl(resolvedMonthlyGivingUrl, "monthly"));

  const isHouseholdSupport = supportMode === "household";
  const showOtherAmount = (giftType === "monthly" && monthlyAmount === "Other") || (giftType === "onetime" && oneTimeAmount === "Other");
  const formTitle = giftType === "monthly" ? "Support Monthly" : "Give One Time";
  const resolvedMonthlyUrl = getGivingUrl(resolvedMonthlyGivingUrl, "monthly");
  const resolvedOneTimeUrl = getGivingUrl(resolvedOneTimeGivingUrl, "onetime");

  useEffect(() => {
    setGiftType(initialGiftType);
  }, [initialGiftType]);

  useEffect(() => {
    setAllocationPreference(allocationLabel);
  }, [allocationLabel]);

  useEffect(() => {
    if (status !== "success" || redirectStarted.current) {
      return;
    }

    redirectStarted.current = true;
    const timer = window.setTimeout(() => {
      window.location.assign(redirectUrl.current);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [status]);

  async function submitCommitment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const activeAmount = giftType === "monthly" ? monthlyAmount : oneTimeAmount;
    const otherAmount = activeAmount === "Other" ? parseAmount(formData.get("otherAmount")) : null;
    const selectedAmount = activeAmount === "Other" ? "Other" : activeAmount;
    const nextRedirectUrl = giftType === "monthly" ? resolvedMonthlyUrl : resolvedOneTimeUrl;

    redirectUrl.current = nextRedirectUrl;
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/support-commitments", {
        body: JSON.stringify({
          allocationPreference,
          defaultAllocation: allocationLabel,
          email: String(formData.get("email") ?? ""),
          firstName: String(formData.get("firstName") ?? ""),
          giftType,
          householdId,
          householdName: contextName,
          lastName: String(formData.get("lastName") ?? ""),
          message: String(formData.get("message") ?? ""),
          otherAmount,
          phone: String(formData.get("phone") ?? ""),
          profileSlug,
          redirectGivingUrl: nextRedirectUrl,
          resolvedMonthlyGivingUrl: resolvedMonthlyUrl,
          resolvedOneTimeGivingUrl: resolvedOneTimeUrl,
          selectedAmount,
          source,
          supportMode,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Unable to save this commitment.");
      }

      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this commitment.");
      setStatus("error");
    }
  }

  const outerClassName = displayMode === "modal"
    ? "rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-4 shadow-[0_28px_90px_rgba(12,10,9,0.28)] md:p-6"
    : "rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-4 shadow-[0_20px_70px_rgba(28,25,23,0.12)] md:p-6 lg:col-span-3";

  return (
    <section className={outerClassName}>
      <div className="space-y-4">
        <div className="max-w-[820px] px-1 pb-1 pr-12 pt-0 md:px-2 md:pr-14">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {contextName}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 md:text-4xl">
            {formTitle}
          </h2>
          <p className="mt-3 max-w-[720px] text-[15px] leading-[1.65] text-stone-800 md:mt-4 md:text-[17px] md:leading-[1.62]">
            Start here so we can connect your gift to the right missionary or fund. After submitting, you'll be taken to our secure giving page.
          </p>
          <p className="mt-4 inline-block max-w-[820px] rounded-2xl border border-[#e2b84e]/45 bg-[#fff3cf] px-4 py-3 text-[14px] leading-[1.62] text-stone-800 md:px-[18px] md:py-[14px] md:text-[15px] md:leading-[1.58]">
            A portion of every missionary support commitment helps sustain USAM leadership, operations, and national expansion.
          </p>
          {!isHouseholdSupport ? (
            <p className="mt-3 rounded-2xl border border-[#D4A63D]/40 bg-[#fff7df] px-4 py-3 text-sm leading-6 text-stone-800">
              {supportExplanation || "This missionary household is not currently raising personal support. You can still give toward the broader mission through the selected fund."}
            </p>
          ) : null}
        </div>

        {status === "success" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950 shadow-sm">
            <p className="font-semibold">Thank you. Continue to the secure giving page to complete your gift.</p>
            <p className="mt-1 text-emerald-800">Opening the secure Church Center giving page now.</p>
          </div>
        ) : null}

        {status !== "success" ? (
          <form className="space-y-4" onSubmit={submitCommitment}>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Contact Information</SectionTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <input id="firstName" name="firstName" type="text" required className={inputClassName} />
                </div>
                <div>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <input id="lastName" name="lastName" type="text" required className={inputClassName} />
                </div>
                <div>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <input id="email" name="email" type="email" required className={inputClassName} />
                </div>
                <div>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <input id="phone" name="phone" type="tel" className={inputClassName} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Gift Details</SectionTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectField id="giftType" label="Gift Type" name="gift_type" value={giftType} onChange={(value) => setGiftType(value as CommitmentGiftType)}>
                  {giftTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectField>

                {giftType === "monthly" ? (
                  <SelectField id="monthlyAmount" label="Monthly Amount" name="monthlyAmount" value={monthlyAmount} onChange={setMonthlyAmount}>
                    <option value="">Select amount</option>
                    {monthlyAmounts.map((amount) => (
                      <option key={amount.value} value={amount.value}>{amount.label}</option>
                    ))}
                  </SelectField>
                ) : null}

                {giftType === "onetime" ? (
                  <SelectField id="oneTimeAmount" label="One Time Amount" name="oneTimeAmount" value={oneTimeAmount} onChange={setOneTimeAmount}>
                    <option value="">Select amount</option>
                    {oneTimeAmounts.map((amount) => (
                      <option key={amount.value} value={amount.value}>{amount.label}</option>
                    ))}
                  </SelectField>
                ) : null}

                {showOtherAmount ? (
                  <div>
                    <FieldLabel htmlFor="otherAmount">Other Amount</FieldLabel>
                    <input
                      id="otherAmount"
                      name="otherAmount"
                      type="text"
                      inputMode="decimal"
                      placeholder="$"
                      required
                      className={inputClassName}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Allocation Preference</SectionTitle>
              <div className="mt-4">
                <SelectField id="allocationPreference" label="Where should this gift be directed?" name="allocationPreference" value={allocationPreference} onChange={setAllocationPreference}>
                  {allocationPreferences.map((preference) => (
                    <option key={preference} value={preference}>{preference}</option>
                  ))}
                </SelectField>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Current profile routing: {allocationLabel}.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Optional Note</SectionTitle>
              <textarea id="message" name="message" rows={4} className={textareaClassName} />
            </div>

            {status === "error" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                {errorMessage || "Something went wrong. Please try again or contact the USAM team directly."}
              </div>
            ) : null}

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Submit</SectionTitle>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-7 py-4 text-center text-xs uppercase leading-5 tracking-[0.22em] text-stone-950 shadow-sm transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_14px_34px_rgba(212,166,61,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              >
                {status === "submitting" ? "Submitting..." : "Continue to Secure Giving"}
              </button>
              <p className="mt-3 text-center text-sm leading-6 text-stone-600">
                Your information helps us connect your gift to the right missionary or fund.
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}

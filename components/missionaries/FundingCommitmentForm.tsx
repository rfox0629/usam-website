"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useForm, ValidationError } from "@formspree/react";
import { DEFAULT_GIVING_URL } from "@/src/lib/giving";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export type CommitmentGiftType = "Monthly" | "One Time" | "Major Gift Conversation";

export type FundingCommitmentFormProps = {
  missionaryName: string;
  missionarySlug: string;
  monthlyGoal: number;
  receivedMonthlySupport: number;
  initialCommittedMonthlySupport?: number;
  generalFundPercentage?: number;
  supportExplanation?: string;
  supportMode?: string;
  supportPublicLabel?: string;
  supportTargetFund?: string | null;
  supportTargetHouseholdName?: string | null;
  onCommitmentSubmitted?: (amount: number) => void;
  displayMode?: "section" | "modal";
  initialGiftType?: CommitmentGiftType;
};

const giftTypeOptions: readonly CommitmentGiftType[] = [
  "Monthly",
  "One Time",
  "Major Gift Conversation",
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

const projectedGiftRanges = [
  "$5,000 to $25,000",
  "$25,000 to $100,000",
  "$100,000+",
  "Unsure",
] as const;

const allocationPreferences = [
  "Support this missionary",
  "Support the General Mission Fund",
  "Help fund missionaries in need",
  "State or regional leadership",
  "National expansion",
  "Unsure",
] as const;

const inputClassName = "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15";
const selectClassName = "min-h-12 w-full appearance-none rounded-xl border border-stone-300 bg-white px-4 pr-11 text-sm text-stone-950 shadow-sm outline-none transition focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15";
const textareaClassName = "mt-2 min-h-28 w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15";
const validationClassName = "mt-2 text-sm leading-5 text-red-700";

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
      className="text-[11px] uppercase tracking-[0.18em] text-stone-700"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="text-sm font-bold uppercase tracking-[0.16em] text-stone-950"
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
          id={id}
          name={name}
          required={required}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          className={selectClassName}
        >
          {children}
        </select>
        <SelectChevron />
      </div>
    </div>
  );
}

export function FundingCommitmentForm({
  missionaryName,
  missionarySlug,
  receivedMonthlySupport,
  initialCommittedMonthlySupport,
  generalFundPercentage = 10,
  supportExplanation,
  supportMode = "household",
  supportPublicLabel,
  supportTargetFund,
  supportTargetHouseholdName,
  onCommitmentSubmitted,
  displayMode = "section",
  initialGiftType = "Monthly",
}: FundingCommitmentFormProps) {
  const [state, handleSubmit] = useForm("xgodeano");
  const [giftType, setGiftType] = useState<CommitmentGiftType>(initialGiftType);
  const [monthlyAmount, setMonthlyAmount] = useState("200");
  const [oneTimeAmount, setOneTimeAmount] = useState("250");
  const [projectedGiftRange, setProjectedGiftRange] = useState("$5,000 to $25,000");
  const [, setCommittedMonthlySupport] = useState(initialCommittedMonthlySupport ?? receivedMonthlySupport);
  const pendingMonthlyCommitment = useRef(0);
  const redirectStarted = useRef(false);

  const isHouseholdSupport = supportMode === "household";
  const allocationLabel = supportPublicLabel || (isHouseholdSupport ? "Support this missionary" : "Support the General Mission Fund");
  const showOtherAmount = (giftType === "Monthly" && monthlyAmount === "Other") || (giftType === "One Time" && oneTimeAmount === "Other");

  useEffect(() => {
    if (!state.succeeded || pendingMonthlyCommitment.current <= 0) {
      return;
    }

    const amount = pendingMonthlyCommitment.current;
    pendingMonthlyCommitment.current = 0;

    // Future: replace local state with Supabase/DOS/accounting sync.
    setCommittedMonthlySupport((current) => current + amount);
    onCommitmentSubmitted?.(amount);
  }, [onCommitmentSubmitted, state.succeeded]);

  useEffect(() => {
    if (!state.succeeded || redirectStarted.current) {
      return;
    }

    redirectStarted.current = true;
    const timer = window.setTimeout(() => {
      window.location.assign(DEFAULT_GIVING_URL);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [state.succeeded]);

  function submitCommitment(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedGiftType = String(formData.get("giftType") ?? "") as CommitmentGiftType;
    const submittedMonthlyAmount = String(formData.get("monthlyAmount") ?? "");
    const monthlyCommitmentAmount = submittedMonthlyAmount === "Other"
      ? parseAmount(formData.get("otherAmount"))
      : parseAmount(submittedMonthlyAmount);

    pendingMonthlyCommitment.current = submittedGiftType === "Monthly" ? monthlyCommitmentAmount : 0;
    handleSubmit(event);
  }

  const outerClassName = displayMode === "modal"
    ? "bg-transparent"
    : "rounded-[28px] border border-stone-200 bg-[#f8f4ec] p-4 shadow-[0_20px_70px_rgba(28,25,23,0.12)] md:p-6 lg:col-span-3";

  return (
    <section className={outerClassName}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#eadfca] bg-[#fffdf7] p-5 shadow-sm md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Support Commitment
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-800">
            Start here so we can connect your gift to the right missionary or fund. After submitting, you'll be taken to our secure giving page.
          </p>
          <p className="mt-4 rounded-xl border border-[#eadfca] bg-[#f8f4ec] px-4 py-3 text-sm leading-6 text-stone-700">
            A portion of every missionary support commitment helps sustain USAM leadership, operations, and national expansion.
          </p>
          {!isHouseholdSupport ? (
            <p className="mt-4 rounded-xl border border-[#D4A63D]/40 bg-[#fff7df] px-4 py-3 text-sm leading-6 text-stone-800">
              {supportExplanation || "This missionary household is not currently raising personal support. You can still give toward the broader mission through the selected fund."}
            </p>
          ) : null}
        </div>

        {state.succeeded ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950 shadow-sm">
            <p className="font-semibold">Thank you. You'll be redirected to complete your gift.</p>
            <p className="mt-1 text-emerald-800">Opening the secure Church Center giving page now.</p>
          </div>
        ) : null}

        {!state.succeeded ? (
          <form className="space-y-5" onSubmit={submitCommitment}>
            <input type="hidden" name="missionaryProfile" value={missionaryName} />
            <input type="hidden" name="missionarySlug" value={missionarySlug} />
            <input type="hidden" name="generalFundPercentage" value={`${generalFundPercentage}%`} />
            <input type="hidden" name="supportMode" value={supportMode} />
            <input type="hidden" name="supportTargetFund" value={supportTargetFund ?? ""} />
            <input type="hidden" name="supportTargetHousehold" value={supportTargetHouseholdName ?? ""} />
            <input type="hidden" name="supportPublicLabel" value={allocationLabel} />

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Contact Information</SectionTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <input id="firstName" name="firstName" type="text" required className={inputClassName} />
                  <ValidationError className={validationClassName} prefix="First Name" field="firstName" errors={state.errors} />
                </div>
                <div>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <input id="lastName" name="lastName" type="text" required className={inputClassName} />
                  <ValidationError className={validationClassName} prefix="Last Name" field="lastName" errors={state.errors} />
                </div>
                <div>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <input id="email" name="email" type="email" required className={inputClassName} />
                  <ValidationError className={validationClassName} prefix="Email" field="email" errors={state.errors} />
                </div>
                <div>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <input id="phone" name="phone" type="tel" className={inputClassName} />
                  <ValidationError className={validationClassName} prefix="Phone" field="phone" errors={state.errors} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Gift Details</SectionTitle>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SelectField id="giftType" label="Gift Type" name="giftType" value={giftType} onChange={(value) => setGiftType(value as CommitmentGiftType)}>
                  {giftTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </SelectField>

                {giftType === "Monthly" ? (
                  <SelectField id="monthlyAmount" label="Monthly Amount" name="monthlyAmount" value={monthlyAmount} onChange={setMonthlyAmount}>
                    {monthlyAmounts.map((amount) => (
                      <option key={amount.value} value={amount.value}>{amount.label}</option>
                    ))}
                  </SelectField>
                ) : null}

                {giftType === "One Time" ? (
                  <SelectField id="oneTimeAmount" label="One Time Amount" name="oneTimeAmount" value={oneTimeAmount} onChange={setOneTimeAmount}>
                    {oneTimeAmounts.map((amount) => (
                      <option key={amount.value} value={amount.value}>{amount.label}</option>
                    ))}
                  </SelectField>
                ) : null}

                {giftType === "Major Gift Conversation" ? (
                  <SelectField id="projectedGiftRange" label="Projected Gift Range" name="projectedGiftRange" value={projectedGiftRange} onChange={setProjectedGiftRange}>
                    {projectedGiftRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
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
                    <ValidationError className={validationClassName} prefix="Other Amount" field="otherAmount" errors={state.errors} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Allocation Preference</SectionTitle>
              <div className="mt-4">
                <SelectField id="allocationPreference" label="Where should this gift be directed?" name="allocationPreference">
                  {allocationPreferences.map((preference) => (
                    <option key={preference} value={preference}>{preference}</option>
                  ))}
                </SelectField>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Current profile routing: {allocationLabel}.
                </p>
                <ValidationError className={validationClassName} prefix="Allocation Preference" field="allocationPreference" errors={state.errors} />
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
              <SectionTitle>Message / Notes</SectionTitle>
              <textarea id="message" name="message" rows={4} className={textareaClassName} />
              <ValidationError className={validationClassName} prefix="Message" field="message" errors={state.errors} />
            </div>

            {state.errors ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                Something went wrong. Please try again or contact the USAM team directly.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={state.submitting}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-7 py-4 text-center text-xs uppercase leading-5 tracking-[0.24em] text-stone-950 shadow-sm transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_14px_34px_rgba(212,166,61,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {state.submitting ? "Submitting..." : "Submit Commitment"}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

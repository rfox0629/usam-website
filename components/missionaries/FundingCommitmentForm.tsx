"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, ValidationError } from "@formspree/react";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

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
};

const monthlyAmounts = ["50", "100", "200", "500", "Other"] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getPercentage(value: number, goal: number) {
  if (goal <= 0) {
    return 0;
  }

  return Math.min(Math.round((value / goal) * 100), 100);
}

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
      className="text-[11px] uppercase tracking-[0.2em] text-stone-300"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </label>
  );
}

export function FundingCommitmentForm({
  missionaryName,
  missionarySlug,
  monthlyGoal,
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
}: FundingCommitmentFormProps) {
  const [state, handleSubmit] = useForm("xgodeano");
  const [giftType, setGiftType] = useState("Monthly");
  const [monthlyAmount, setMonthlyAmount] = useState("200");
  const [committedMonthlySupport, setCommittedMonthlySupport] = useState(
    initialCommittedMonthlySupport ?? receivedMonthlySupport,
  );
  const pendingMonthlyCommitment = useRef(0);

  const receivedPercent = useMemo(
    () => getPercentage(receivedMonthlySupport, monthlyGoal),
    [monthlyGoal, receivedMonthlySupport],
  );
  const committedPercent = useMemo(
    () => getPercentage(committedMonthlySupport, monthlyGoal),
    [committedMonthlySupport, monthlyGoal],
  );
  const isHouseholdSupport = supportMode === "household";
  const allocationLabel = supportPublicLabel || (isHouseholdSupport ? "Support this missionary" : "Support the USA Missionaries General Fund");

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

  function submitCommitment(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const submittedGiftType = String(formData.get("giftType") ?? "");
    const submittedMonthlyAmount = String(formData.get("monthlyAmount") ?? "");
    const monthlyCommitmentAmount = submittedMonthlyAmount === "Other"
      ? parseAmount(formData.get("otherAmount"))
      : parseAmount(submittedMonthlyAmount);

    pendingMonthlyCommitment.current = submittedGiftType === "Monthly" ? monthlyCommitmentAmount : 0;
    handleSubmit(event);
  }

  const outerClassName = displayMode === "modal"
    ? "bg-transparent"
    : "border border-stone-800/70 bg-stone-950/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:p-7 lg:col-span-3";
  const gridClassName = displayMode === "modal"
    ? "grid gap-6"
    : "grid gap-8 lg:grid-cols-[0.9fr_1.1fr]";

  return (
    <section className={outerClassName}>
      <div className={gridClassName}>
        <div>
          <p className="text-[13px] uppercase tracking-[0.2em] text-stone-100" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {isHouseholdSupport ? "Monthly Support" : "Support Routing"}
          </p>

          {isHouseholdSupport ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  ["Monthly Goal", monthlyGoal],
                  ["Received", receivedMonthlySupport],
                  ["Committed", committedMonthlySupport],
                ].map(([label, value]) => (
                  <div key={label} className="border border-stone-800/70 bg-[#060606]/80 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-stone-100" style={{ fontFamily: font.oswald }}>
                      {formatCurrency(Number(value))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-7 space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-4 text-sm text-stone-300">
                    <span>Received Support</span>
                    <span>{receivedPercent}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-800">
                    <div className="h-full rounded-full bg-[#D4A63D]" style={{ width: `${receivedPercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4 text-sm text-stone-300">
                    <span>Committed Support</span>
                    <span>{committedPercent}%</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-800">
                    <div className="h-full rounded-full bg-[#F5B942]/80" style={{ width: `${committedPercent}%` }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 border border-stone-800/70 bg-[#060606]/80 p-5">
              <p className="text-xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                {allocationLabel}
              </p>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                {supportExplanation || "This missionary household is not currently raising personal support. You can still give toward the broader mission through the selected fund."}
              </p>
            </div>
          )}

          <p className="mt-6 text-sm leading-6 text-stone-400">
            This form documents your giving commitment. A USAM team member will follow up with the giving link and next steps.
          </p>

          <p className="mt-4 border-l-2 border-[#D4A63D]/60 pl-4 text-sm leading-6 text-stone-500">
            A portion of every missionary support commitment helps sustain USAM leadership, operations, and national expansion.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/support"
              className="inline-flex min-h-12 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_0_22px_rgba(212,166,61,0.24)] sm:w-auto"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              Give Monthly
            </a>
            <a
              href="/support"
              className="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-[#D4A63D] hover:bg-white/[0.04] sm:w-auto"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              Give One Time
            </a>
          </div>
        </div>

        <div className={displayMode === "modal" ? "border border-stone-800/70 bg-[#070707] p-5 md:p-6" : "border border-stone-800/70 bg-[#070707] p-5 md:p-6"}>
          <p className="text-[13px] uppercase tracking-[0.2em] text-stone-100" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Make a Commitment
          </p>

          {state.succeeded ? (
            <div className="mt-6 border border-[#D4A63D]/30 bg-[#D4A63D]/10 p-5 text-sm leading-7 text-stone-100">
              Thank you. Your commitment has been received. Our team will follow up with next steps.
            </div>
          ) : null}

          {state.errors ? (
            <div className="mt-6 border border-red-500/30 bg-red-950/20 p-5 text-sm leading-7 text-red-200">
              Something went wrong. Please try again or contact the USAM team directly.
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={submitCommitment}>
            <input type="hidden" name="missionaryProfile" value={missionaryName} />
            <input type="hidden" name="missionarySlug" value={missionarySlug} />
            <input type="hidden" name="generalFundPercentage" value={`${generalFundPercentage}%`} />
            <input type="hidden" name="supportMode" value={supportMode} />
            <input type="hidden" name="supportTargetFund" value={supportTargetFund ?? ""} />
            <input type="hidden" name="supportTargetHousehold" value={supportTargetHouseholdName ?? ""} />
            <input type="hidden" name="supportPublicLabel" value={allocationLabel} />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
                />
                <ValidationError prefix="First Name" field="firstName" errors={state.errors} />
              </div>
              <div>
                <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
                />
                <ValidationError prefix="Last Name" field="lastName" errors={state.errors} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
                />
                <ValidationError prefix="Email" field="email" errors={state.errors} />
              </div>
              <div>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
                />
                <ValidationError prefix="Phone" field="phone" errors={state.errors} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="giftType">Gift Type</FieldLabel>
                <select
                  id="giftType"
                  name="giftType"
                  value={giftType}
                  onChange={(event) => setGiftType(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
                >
                  <option>Monthly</option>
                  <option>One Time</option>
                  <option>Major Gift Conversation</option>
                </select>
                <ValidationError prefix="Gift Type" field="giftType" errors={state.errors} />
              </div>

              <div>
                <FieldLabel htmlFor="monthlyAmount">Monthly Amount</FieldLabel>
                <select
                  id="monthlyAmount"
                  name="monthlyAmount"
                  value={monthlyAmount}
                  onChange={(event) => setMonthlyAmount(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
                >
                  {monthlyAmounts.map((amount) => (
                    <option key={amount} value={amount}>
                      {amount === "Other" ? "Other" : `$${amount}`}
                    </option>
                  ))}
                </select>
                <ValidationError prefix="Monthly Amount" field="monthlyAmount" errors={state.errors} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="otherAmount">Other Amount</FieldLabel>
                <input
                  id="otherAmount"
                  name="otherAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="$"
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
                />
                <ValidationError prefix="Other Amount" field="otherAmount" errors={state.errors} />
              </div>

              <div>
                <FieldLabel htmlFor="allocationPreference">Allocation Preference</FieldLabel>
                <select
                  id="allocationPreference"
                  name="allocationPreference"
                  className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
                >
                  <option>{allocationLabel}</option>
                  <option>Support this missionary</option>
                  <option>Support the general mission fund</option>
                  <option>Help fund missionaries in need</option>
                </select>
                <ValidationError prefix="Allocation Preference" field="allocationPreference" errors={state.errors} />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="message">Message / Notes</FieldLabel>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="mt-2 w-full resize-none rounded-md border border-stone-700 bg-[#050505] px-4 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
              />
              <ValidationError prefix="Message" field="message" errors={state.errors} />
            </div>

            <button
              type="submit"
              disabled={state.submitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            >
              {state.submitting ? "Submitting..." : "Submit Commitment"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

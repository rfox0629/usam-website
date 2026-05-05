import type { ReactNode } from "react";
import { submitFinancialFreedomInquiry } from "./actions";
import { FinancialFreedomUploadField } from "./FinancialFreedomUploadField";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const errorMessages: Record<string, string> = {
  config: "The inquiry system is not configured yet. Please try again later.",
  consent: "Please confirm each consent statement before submitting.",
  missing: "Please include your full name and email before submitting.",
  submit: "Your inquiry could not be submitted. Please try again in a moment.",
};

const helpAreas = [
  { label: "Budget clarity", name: "help_budget" },
  { label: "Debt payoff plan", name: "help_debt" },
  { label: "Savings reserve", name: "help_savings" },
  { label: "Retirement clarity", name: "help_retirement" },
  { label: "Generosity plan", name: "help_generosity" },
  { label: "Overall stewardship plan", name: "help_overall_plan" },
] as const;

const snapshotFields = [
  { label: "Approximate monthly income", name: "monthly_income" },
  { label: "Approximate monthly expenses", name: "monthly_expenses" },
  { label: "Current savings", name: "current_savings" },
  { label: "Total debt", name: "total_debt" },
  { label: "Monthly debt payments", name: "monthly_debt_payments" },
  { label: "Monthly giving", name: "monthly_giving" },
] as const;

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-xl border border-stone-700 bg-[#050505] px-4 text-base text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D] md:text-sm";
}

function textAreaClassName() {
  return "mt-2 min-h-[145px] w-full rounded-xl border border-stone-700 bg-[#050505] px-4 py-3 text-base leading-8 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D] md:text-sm md:leading-7";
}

function FieldLabel({
  children,
  htmlFor,
  required = false,
}: {
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs uppercase tracking-[0.14em] text-stone-300"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      {required ? <span className="ml-1 text-[#F5B942]">*</span> : null}
    </label>
  );
}

function SectionCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <section className="rounded-2xl border border-stone-800/70 bg-stone-950/55 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-7 lg:p-8">
      <h2 className="text-2xl font-semibold leading-tight text-stone-100 md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-400 md:text-base md:leading-8">
          {description}
        </p>
      ) : null}
      <div className="mt-6 space-y-6">
        {children}
      </div>
    </section>
  );
}

function TextInput({
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
      <FieldLabel htmlFor={name} required={required}>{label}</FieldLabel>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "0.01" : undefined}
        placeholder={placeholder}
        className={fieldClassName()}
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        className={textAreaClassName()}
      />
    </div>
  );
}

function ConsentCheckbox({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  return (
    <label className="flex gap-3 rounded-xl border border-stone-800 bg-[#050505] p-4 text-sm leading-7 text-stone-300 transition-colors hover:border-[#D4A63D]/70">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-1 h-4 w-4 shrink-0 accent-[#D4A63D]"
      />
      <span>{children}</span>
    </label>
  );
}

export function FinancialFreedomInquiryForm({
  error,
  submitted,
  uploadPartial,
}: {
  error?: string;
  submitted: boolean;
  uploadPartial: boolean;
}) {
  if (submitted) {
    return (
      <div className="rounded-2xl border border-[#D4A63D]/30 bg-[#D4A63D]/10 p-7 text-base leading-8 text-stone-100 md:p-10">
        <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
          Inquiry Received
        </p>
        <h2 className="mt-4 text-4xl font-bold leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
          Inquiry received
        </h2>
        <p className="mt-5 max-w-3xl text-stone-300">
          Thank you. Your inquiry has been received. We will review it carefully and follow up with next steps.
        </p>
        {uploadPartial ? (
          <p className="mt-5 max-w-3xl rounded-xl border border-amber-500/25 bg-amber-950/20 p-4 text-sm leading-7 text-amber-100">
            Your inquiry was saved, but one or more files may not have uploaded. We can still follow up from the information you submitted.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={submitFinancialFreedomInquiry} className="space-y-6 md:space-y-7">
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-sm leading-7 text-red-200">
          {errorMessages[error] ?? errorMessages.submit}
        </div>
      ) : null}

      <SectionCard
        title="Start Here"
        description="This guided intake helps us understand where support may be useful. Keep answers approximate and only share what you are comfortable sharing."
      >
        <div className="rounded-2xl border border-[#D4A63D]/25 bg-[#D4A63D]/10 p-5 text-sm leading-7 text-stone-300 md:p-6">
          <p className="text-base font-semibold text-stone-100">
            Before you share
          </p>
          <p className="mt-2">
            Please redact sensitive details before uploading documents. Do not include full account numbers, Social Security numbers, passwords, login information, or anything you do not want reviewed.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Contact Info" description="Tell us who to follow up with after the inquiry is reviewed.">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Full name" name="full_name" autoComplete="name" required />
          <TextInput label="Email" name="email" type="email" autoComplete="email" required />
          <TextInput label="Phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </SectionCard>

      <SectionCard title="What Would You Like Help With?" description="Choose the areas where clarity would be most helpful right now.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {helpAreas.map((area) => (
            <label key={area.name} className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-800 bg-[#050505] px-4 py-3 text-sm leading-6 text-stone-300 transition-colors hover:border-[#D4A63D]/70">
              <input
                type="checkbox"
                name={area.name}
                className="h-4 w-4 accent-[#D4A63D]"
              />
              <span>{area.label}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Financial Snapshot" description="Use approximate numbers. Leave anything blank if you are not sure or do not want to share it.">
        <div className="grid gap-5 md:grid-cols-2">
          {snapshotFields.map((field) => (
            <TextInput
              key={field.name}
              label={field.label}
              name={field.name}
              type="number"
              placeholder="0"
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Main Burden" description="A few sentences are enough. Name the pressure point, decision, or pattern that feels heavy.">
        <TextArea
          label="What feels most heavy financially right now?"
          name="main_financial_burden"
          placeholder="Share the pressure point, concern, or decision you are facing."
        />
      </SectionCard>

      <SectionCard title="Desired Outcome" description="Describe what you are hoping would be different a year from now.">
        <TextArea
          label="What would financial freedom look like 12 months from now?"
          name="desired_12_month_outcome"
          placeholder="Describe the clarity, progress, or support you are hoping for."
        />
      </SectionCard>

      <SectionCard
        title="Optional Uploads"
        description="You may upload redacted screenshots or documents that help us understand your financial picture."
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-stone-400">
            Please remove or cover full account numbers, Social Security numbers, addresses, passwords, and any information you do not want reviewed.
          </p>
          <p className="text-sm leading-7 text-stone-500">
            Examples: budgeting app screenshot, bank statement, credit card statement, loan statement, retirement statement, CSV export, or PDF.
          </p>
          <FinancialFreedomUploadField />
        </div>
      </SectionCard>

      <SectionCard title="Consent" description="These confirmations help keep the inquiry clear and voluntary.">
        <div className="space-y-3">
          <ConsentCheckbox name="consent_not_advice">
            I understand this is not financial, investment, tax, or legal advice.
          </ConsentCheckbox>
          <ConsentCheckbox name="consent_voluntary_submission">
            I understand I am voluntarily submitting this information for stewardship review and planning help.
          </ConsentCheckbox>
          <ConsentCheckbox name="consent_redacted_uploads">
            I understand I should redact sensitive information before uploading documents.
          </ConsentCheckbox>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-5 rounded-2xl border border-stone-800/70 bg-[#070707] p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <p className="max-w-2xl text-sm leading-7 text-stone-400">
          Your inquiry will be reviewed by approved admins only. Public visitors cannot read submitted inquiry data.
        </p>
        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-stone-100 px-7 py-3 text-xs uppercase tracking-[0.2em] text-stone-950 transition-colors hover:bg-amber-200 sm:w-auto"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Submit Inquiry
        </button>
      </div>
    </form>
  );
}

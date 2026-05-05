import type { ReactNode } from "react";
import { submitPrayerPartnerApplication } from "./actions";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const errorMessages: Record<string, string> = {
  confidentiality: "Please confirm the confidentiality agreement before submitting.",
  config: "The prayer application system is not configured yet. Please try again later.",
  missing: "Please include your first name, last name, and email before submitting.",
  submit: "Your application could not be submitted. Please try again in a moment.",
};

const availabilityOptions = [
  "Daily",
  "Weekly",
  "As Needed",
  "During Kitchen Table Meetings",
] as const;

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";
}

function textAreaClassName() {
  return "mt-2 min-h-[150px] w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base leading-8 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm md:leading-7";
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
      className="text-xs uppercase tracking-[0.14em] text-stone-700"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      {required ? <span className="ml-1 text-[#F5B942]">*</span> : null}
    </label>
  );
}

function TextInput({
  autoComplete,
  label,
  name,
  required = false,
  type = "text",
}: {
  autoComplete?: string;
  label: string;
  name: string;
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
        className={fieldClassName()}
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  required = false,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} required={required}>{label}</FieldLabel>
      <textarea
        id={name}
        name={name}
        required={required}
        className={textAreaClassName()}
      />
    </div>
  );
}

function Checkbox({
  children,
  name,
  required = false,
  value,
}: {
  children: ReactNode;
  name: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="flex min-h-12 gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700 transition-colors hover:border-[#D4A63D]/70">
      <input
        type="checkbox"
        name={name}
        value={value}
        required={required}
        className="mt-1 h-4 w-4 shrink-0 accent-[#D4A63D]"
      />
      <span>{children}</span>
    </label>
  );
}

export function PrayerPartnerApplicationForm({
  error,
  submitted,
}: {
  error?: string;
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-7 text-base leading-8 text-emerald-950 shadow-sm md:p-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Application Received
        </p>
        <h2 className="mt-4 text-4xl font-bold uppercase leading-none text-emerald-950" style={{ fontFamily: font.oswald }}>
          Thank you
        </h2>
        <p className="mt-5 max-w-3xl text-emerald-900">
          Thank you for applying to join the USA Missionaries Prayer Team. Our team will review your request and follow up with next steps.
        </p>
      </div>
    );
  }

  return (
    <form action={submitPrayerPartnerApplication} className="rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-4 shadow-[0_28px_90px_rgba(12,10,9,0.18)] md:p-6">
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
          {errorMessages[error] ?? errorMessages.submit}
        </div>
      ) : null}

      <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7 lg:p-8">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-stone-900" style={{ fontFamily: font.rajdhani }}>
          Prayer Partner Intake
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <TextInput label="First name" name="first_name" autoComplete="given-name" required />
          <TextInput label="Last name" name="last_name" autoComplete="family-name" required />
          <TextInput label="Email" name="email" type="email" autoComplete="email" required />
          <TextInput label="Phone" name="phone" type="tel" autoComplete="tel" />
          <TextInput label="City" name="city" autoComplete="address-level2" />
          <TextInput label="State" name="state" autoComplete="address-level1" />
          <TextInput label="Church affiliation" name="church_affiliation" />
          <TextInput label="How did you hear about USA Missionaries?" name="referral_source" />
        </div>

        <div className="mt-6">
          <TextArea label="Why do you want to join the prayer team?" name="motivation" required />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7 lg:p-8">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-stone-900" style={{ fontFamily: font.rajdhani }}>
          Alerts And Availability
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Checkbox name="email_alerts">I am willing to receive prayer alerts by email.</Checkbox>
          <Checkbox name="sms_alerts">I am willing to receive prayer alerts by text.</Checkbox>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.14em] text-stone-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Availability
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {availabilityOptions.map((option) => (
              <Checkbox key={option} name="availability" value={option}>{option}</Checkbox>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7 lg:p-8">
        <Checkbox name="confidentiality_agreement" required>
          I understand this is a confidential prayer assignment and I will not share sensitive requests publicly.
        </Checkbox>

        <button
          type="submit"
          className="mt-6 inline-flex min-h-[54px] w-full items-center justify-center rounded-xl border border-transparent bg-[#D4A63D] px-7 py-4 text-center text-xs uppercase leading-5 tracking-[0.22em] text-stone-950 shadow-sm transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_14px_34px_rgba(212,166,61,0.22)]"
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          Request to Join the Prayer Team
        </button>
      </section>
      </div>
    </form>
  );
}

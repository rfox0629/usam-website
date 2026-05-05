"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getString, submitPublicForm } from "@/components/forms/submitPublicForm";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const roleOptions = [
  "Missionary Couple",
  "Missionary",
  "State Director",
  "Regional Leader",
  "Support Team",
  "Missionary Candidate",
] as const;

const yesNoReviewOptions = ["Yes", "No", "Needs Review"] as const;

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm";
}

function textAreaClassName(size: "standard" | "large" = "standard") {
  const height = size === "large" ? "min-h-[260px]" : "min-h-[150px]";
  return `mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base leading-7 text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-[#D4A63D] focus:ring-4 focus:ring-[#D4A63D]/15 md:text-sm ${height}`;
}

function FieldLabel({ children, htmlFor, required = false }: { children: ReactNode; htmlFor: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] uppercase tracking-[0.2em] text-stone-700"
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
      {required ? <span className="ml-1 text-[#F5B942]">*</span> : null}
    </label>
  );
}

function HelperText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-6 text-stone-500">
      {children}
    </p>
  );
}

function SectionCard({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold uppercase leading-none text-stone-950 md:text-4xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 md:text-base">
          {description}
        </p>
      ) : null}
      <div className="mt-7 space-y-6">
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
        placeholder={placeholder}
        className={fieldClassName()}
      />
    </div>
  );
}

function TextArea({
  helper,
  label,
  name,
  placeholder,
  required = false,
  size = "standard",
}: {
  helper?: ReactNode;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  size?: "standard" | "large";
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} required={required}>{label}</FieldLabel>
      {helper ? <HelperText>{helper}</HelperText> : null}
      <textarea
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className={textAreaClassName(size)}
      />
    </div>
  );
}

function RadioGroup({
  label,
  name,
  options,
  required = false,
}: {
  label: string;
  name: string;
  options: readonly string[];
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
        {required ? <span className="ml-1 text-[#F5B942]">*</span> : null}
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-700 transition-colors hover:border-[#D4A63D]/70">
            <input
              type="radio"
              name={name}
              value={option}
              required={required}
              className="h-4 w-4 accent-[#D4A63D]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SelectField() {
  return (
    <div>
      <FieldLabel htmlFor="role">Role</FieldLabel>
      <select id="role" name="role" className={fieldClassName()} defaultValue="">
        <option value="" disabled>Select role</option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
    </div>
  );
}

export function MissionaryIntakeForm() {
  const [status, setStatus] = useState<"error" | "idle" | "submitting" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");

  useEffect(() => {
    setSubmittedAt(new Date().toISOString());
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("submitting");
    setErrorMessage("");

    const missionaryName = getString(formData, "missionaryName");
    const primaryContactName = getString(formData, "primaryContactName");
    const [firstName = primaryContactName || missionaryName, ...lastNameParts] = (primaryContactName || missionaryName).split(/\s+/);
    const payload: Record<string, unknown> = {};

    for (const [key, value] of Array.from(formData.entries())) {
      if (value instanceof File) {
        continue;
      }

      if (key in payload) {
        const currentValue = payload[key];
        payload[key] = Array.isArray(currentValue)
          ? [...currentValue, String(value)]
          : [currentValue, String(value)];
      } else {
        payload[key] = String(value);
      }
    }

    try {
      await submitPublicForm({
        email: getString(formData, "email"),
        firstName,
        formType: "missionary_application",
        lastName: lastNameParts.join(" "),
        message: getString(formData, "shortMission") || getString(formData, "anythingElse"),
        payload,
        phone: getString(formData, "phone"),
        sourcePage: "/missionary-intake",
      });

      form.reset();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit this intake.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-8 text-base leading-8 text-emerald-950 shadow-sm md:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Intake Received
        </p>
        <h2 className="mt-4 text-4xl font-bold uppercase leading-none text-emerald-950" style={{ fontFamily: font.oswald }}>
          Thank You
        </h2>
        <p className="mt-5 max-w-3xl text-emerald-900">
          Thank you. Your missionary profile intake has been received. Our team will review it and follow up with next steps.
        </p>
      </div>
    );
  }

  return (
    <form className="rounded-[28px] border border-stone-200 bg-[#fbfaf7] p-4 shadow-[0_28px_90px_rgba(12,10,9,0.18)] md:p-6" onSubmit={handleSubmit}>
      <input type="hidden" name="formType" value="missionary_profile_intake" />
      <input type="hidden" name="source" value="usamissionaries.org" />
      <input type="hidden" name="submittedAt" value={submittedAt} />

      <div className="space-y-8">
        {status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-800">
            {errorMessage || "Something went wrong. Please try again or contact the USAM team directly."}
          </div>
        ) : null}

      <SectionCard eyebrow="Section 01" title="Basic Information">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Missionary name or couple name" name="missionaryName" required />
          <TextInput label="Primary contact name" name="primaryContactName" />
          <TextInput label="Email" name="email" type="email" autoComplete="email" required />
          <TextInput label="Phone" name="phone" type="tel" autoComplete="tel" />
          <TextInput label="Current city" name="currentCity" />
          <TextInput label="State" name="state" />
          <TextInput label="Serving region" name="servingRegion" />
          <SelectField />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 02" title="Short Mission Statement">
        <TextArea
          label="In 1 to 2 sentences, describe the mission God has called you to."
          name="shortMission"
          required
          placeholder="Reaching the lost, making disciples, and helping multiply the mission across America."
        />
      </SectionCard>

      <SectionCard eyebrow="Section 03" title="Our Story">
        <TextArea
          label="Write 400 to 700 words."
          name="ourStory"
          required
          size="large"
          helper="Share how God called you, what He has done in your life, why you are joining USAM, and what you are believing Him for in this next season."
          placeholder="Example: We were not stepping into certainty. We were stepping into obedience. When the Lord called us, we knew it meant laying down comfort, stability, and the direction we had been building for years. But where He guides, He provides. Our desire is to spend our lives reaching people, making disciples, and helping others walk in full surrender to Jesus."
        />
      </SectionCard>

      <SectionCard eyebrow="Section 04" title="Personal Testimony">
        <TextArea
          label="Share your testimony or a shortened version of it."
          name="personalTestimony"
          size="large"
          helper="Aim for 300 to 600 words. Include what your life was like before Christ, how God drew you to Himself, and how your life has changed."
        />
      </SectionCard>

      <SectionCard eyebrow="Section 05" title="Family Details">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Spouse name" name="spouseName" />
          <TextInput label="Children names and ages" name="childrenNamesAndAges" />
        </div>
        <TextArea
          label="Anything about your family you want public"
          name="publicFamilyDetails"
        />
      </SectionCard>

      <SectionCard eyebrow="Section 06" title="Testimonies / Fruit">
        {/* Future: connect this section to the DOS testimony feed. */}
        <TextArea
          label="Share testimonies, fruit, answered prayers, or approved quotes."
          name="testimonies"
          size="large"
          helper="Only include stories you have permission to share. You may keep names anonymous. Eventually DOS will feed this section automatically."
        />
      </SectionCard>

      <SectionCard eyebrow="Section 07" title="Ministry Activity">
        <TextArea label="How are you currently serving?" name="currentService" />
        <TextArea label="Who are you currently discipling or walking with?" name="discipleshipRelationships" helper="Do not include sensitive names unless approved." />
        <TextArea label="What ministries, churches, or communities are you connected to?" name="ministryConnections" />
        <TextArea label="What does a typical ministry week look like?" name="typicalMinistryWeek" />
      </SectionCard>

      <SectionCard eyebrow="Section 08" title="Support Goal">
        {/* Future: connect support data to the Supabase missionary_profiles table and DOS stewardship section. */}
        <RadioGroup label="Do you need to raise support?" name="needsSupport" options={["Yes", "No", "Not sure"]} />
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput label="Annual support goal" name="annualSupportGoal" type="number" />
          <TextInput label="Monthly support goal" name="monthlySupportGoal" type="number" />
          <TextInput label="Current monthly support committed" name="currentMonthlySupportCommitted" type="number" />
        </div>
        <TextInput
          label="Goal basis"
          name="goalBasis"
          placeholder="Example: Based on the median household income in Lakeville, Minnesota."
        />
        <RadioGroup label="Should debt snapshot be visible?" name="showDebtSnapshot" options={["Yes", "No"]} />
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput label="Total debt amount, optional" name="totalDebtAmount" type="number" />
          <TextInput label="Monthly debt burden, optional" name="monthlyDebtBurden" type="number" />
          <TextInput label="Freedom goal date, optional" name="freedomGoalDate" type="date" />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 09" title="Current Needs">
        <div className="grid gap-5 md:grid-cols-2">
          <TextArea label="Monthly partners needed" name="monthlyPartnersNeeded" />
          <TextArea label="One-time needs" name="oneTimeNeeds" />
          <TextArea label="Travel needs" name="travelNeeds" />
          <TextArea label="Vehicle or housing needs" name="vehicleOrHousingNeeds" />
          <TextArea label="Technology or equipment needs" name="technologyOrEquipmentNeeds" />
          <TextArea label="Prayer needs" name="prayerNeeds" />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 10" title="Prayer Requests">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Prayer request 1" name="prayerRequest1" />
          <TextInput label="Prayer request 2" name="prayerRequest2" />
          <TextInput label="Prayer request 3" name="prayerRequest3" />
          <TextInput label="Prayer request 4" name="prayerRequest4" />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 11" title="Photos">
        <HelperText>
          Direct photo uploads for intake are not enabled here yet. Add a Google Drive folder link with any profile, family, or ministry photos you want reviewed.
        </HelperText>
        <TextInput label="Google Drive folder link, optional" name="googleDriveFolderLink" type="url" />
      </SectionCard>

      <SectionCard eyebrow="Section 12" title="Profile Visibility">
        {/* Future: route these answers into an admin approval workflow. */}
        <RadioGroup label="Can this profile be public?" name="profileVisibility" options={yesNoReviewOptions} required />
        <RadioGroup label="Can we share your story publicly?" name="shareStoryPublicly" options={yesNoReviewOptions} />
        <RadioGroup label="Can we share family details publicly?" name="shareFamilyDetailsPublicly" options={yesNoReviewOptions} />
        <RadioGroup label="Can we share giving goal publicly?" name="shareGivingGoalPublicly" options={yesNoReviewOptions} />
        <RadioGroup label="Can we share testimonies publicly?" name="shareTestimoniesPublicly" options={yesNoReviewOptions} />
      </SectionCard>

      <SectionCard eyebrow="Section 13" title="Final Review">
        <TextArea
          label="Is there anything else we should know before building your profile?"
          name="anythingElse"
        />
      </SectionCard>

      <div className="sticky bottom-0 z-20 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-[0_-20px_60px_rgba(28,25,23,0.14)] backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-stone-600">
            Required fields are marked with gold. Your answers can be reviewed before anything is published.
          </p>
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex min-h-12 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_0_22px_rgba(212,166,61,0.24)] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {status === "submitting" ? "Submitting..." : "Submit Profile Intake"}
          </button>
        </div>
      </div>
      </div>
    </form>
  );
}

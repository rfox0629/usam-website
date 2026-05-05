"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm, ValidationError, type ValidationErrorProps } from "@formspree/react";

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
type IntakeFormErrors = ValidationErrorProps<Record<string, string>>["errors"];

function fieldClassName() {
  return "mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-[#050505] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]";
}

function textAreaClassName(size: "standard" | "large" = "standard") {
  const height = size === "large" ? "min-h-[260px]" : "min-h-[150px]";
  return `mt-2 w-full rounded-md border border-stone-700 bg-[#050505] px-4 py-3 text-sm leading-7 text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D] ${height}`;
}

function FieldLabel({ children, htmlFor, required = false }: { children: ReactNode; htmlFor: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] uppercase tracking-[0.2em] text-stone-300"
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
    <section className="border border-stone-800/70 bg-stone-950/55 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] md:p-7">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400 md:text-base">
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
  errors,
}: {
  autoComplete?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  errors: IntakeFormErrors;
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
      <ValidationError prefix={label} field={name} errors={errors} />
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
  errors,
}: {
  helper?: ReactNode;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  size?: "standard" | "large";
  errors: IntakeFormErrors;
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
      <ValidationError prefix={label} field={name} errors={errors} />
    </div>
  );
}

function RadioGroup({
  label,
  name,
  options,
  required = false,
  errors,
}: {
  label: string;
  name: string;
  options: readonly string[];
  required?: boolean;
  errors: IntakeFormErrors;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
        {required ? <span className="ml-1 text-[#F5B942]">*</span> : null}
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex min-h-12 items-center gap-3 rounded-md border border-stone-800 bg-[#050505] px-4 text-sm text-stone-300 transition-colors hover:border-[#D4A63D]/70">
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
      <ValidationError prefix={label} field={name} errors={errors} />
    </fieldset>
  );
}

function SelectField({ errors }: { errors: IntakeFormErrors }) {
  return (
    <div>
      <FieldLabel htmlFor="role">Role</FieldLabel>
      <select id="role" name="role" className={fieldClassName()} defaultValue="">
        <option value="" disabled>Select role</option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>{role}</option>
        ))}
      </select>
      <ValidationError prefix="Role" field="role" errors={errors} />
    </div>
  );
}

function FileInput({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <input
        id={name}
        name={name}
        type="file"
        accept="image/*"
        className="mt-2 w-full rounded-md border border-dashed border-stone-700 bg-[#050505] px-4 py-4 text-sm text-stone-300 file:mr-4 file:rounded-md file:border-0 file:bg-[#D4A63D] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-[0.16em] file:text-black hover:border-[#D4A63D]/70"
      />
    </div>
  );
}

export function MissionaryIntakeForm() {
  const [state, handleSubmit] = useForm("mvzlovnk");
  const [submittedAt, setSubmittedAt] = useState("");

  useEffect(() => {
    setSubmittedAt(new Date().toISOString());
  }, []);

  if (state.succeeded) {
    return (
      <div className="border border-[#D4A63D]/30 bg-[#D4A63D]/10 p-8 text-base leading-8 text-stone-100 md:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Intake Received
        </p>
        <h2 className="mt-4 text-4xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
          Thank You
        </h2>
        <p className="mt-5 max-w-3xl text-stone-300">
          Thank you. Your missionary profile intake has been received. Our team will review it and follow up with next steps.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="hidden" name="formType" value="missionary_profile_intake" />
      <input type="hidden" name="source" value="usamissionaries.org" />
      <input type="hidden" name="submittedAt" value={submittedAt} />

      {state.errors ? (
        <div className="border border-red-500/30 bg-red-950/20 p-5 text-sm leading-7 text-red-200">
          Something went wrong. Please try again or contact the USAM team directly.
        </div>
      ) : null}

      <SectionCard eyebrow="Section 01" title="Basic Information">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Missionary name or couple name" name="missionaryName" required errors={state.errors} />
          <TextInput label="Primary contact name" name="primaryContactName" errors={state.errors} />
          <TextInput label="Email" name="email" type="email" autoComplete="email" required errors={state.errors} />
          <TextInput label="Phone" name="phone" type="tel" autoComplete="tel" errors={state.errors} />
          <TextInput label="Current city" name="currentCity" errors={state.errors} />
          <TextInput label="State" name="state" errors={state.errors} />
          <TextInput label="Serving region" name="servingRegion" errors={state.errors} />
          <SelectField errors={state.errors} />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 02" title="Short Mission Statement">
        <TextArea
          label="In 1 to 2 sentences, describe the mission God has called you to."
          name="shortMission"
          required
          placeholder="Reaching the lost, making disciples, and helping multiply the mission across America."
          errors={state.errors}
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
          errors={state.errors}
        />
      </SectionCard>

      <SectionCard eyebrow="Section 04" title="Personal Testimony">
        <TextArea
          label="Share your testimony or a shortened version of it."
          name="personalTestimony"
          size="large"
          helper="Aim for 300 to 600 words. Include what your life was like before Christ, how God drew you to Himself, and how your life has changed."
          errors={state.errors}
        />
      </SectionCard>

      <SectionCard eyebrow="Section 05" title="Family Details">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Spouse name" name="spouseName" errors={state.errors} />
          <TextInput label="Children names and ages" name="childrenNamesAndAges" errors={state.errors} />
        </div>
        <TextArea
          label="Anything about your family you want public"
          name="publicFamilyDetails"
          errors={state.errors}
        />
      </SectionCard>

      <SectionCard eyebrow="Section 06" title="Testimonies / Fruit">
        {/* Future: connect this section to the DOS testimony feed. */}
        <TextArea
          label="Share testimonies, fruit, answered prayers, or approved quotes."
          name="testimonies"
          size="large"
          helper="Only include stories you have permission to share. You may keep names anonymous. Eventually DOS will feed this section automatically."
          errors={state.errors}
        />
      </SectionCard>

      <SectionCard eyebrow="Section 07" title="Ministry Activity">
        <TextArea label="How are you currently serving?" name="currentService" errors={state.errors} />
        <TextArea label="Who are you currently discipling or walking with?" name="discipleshipRelationships" helper="Do not include sensitive names unless approved." errors={state.errors} />
        <TextArea label="What ministries, churches, or communities are you connected to?" name="ministryConnections" errors={state.errors} />
        <TextArea label="What does a typical ministry week look like?" name="typicalMinistryWeek" errors={state.errors} />
      </SectionCard>

      <SectionCard eyebrow="Section 08" title="Support Goal">
        {/* Future: connect support data to the Supabase missionary_profiles table and DOS stewardship section. */}
        <RadioGroup label="Do you need to raise support?" name="needsSupport" options={["Yes", "No", "Not sure"]} errors={state.errors} />
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput label="Annual support goal" name="annualSupportGoal" type="number" errors={state.errors} />
          <TextInput label="Monthly support goal" name="monthlySupportGoal" type="number" errors={state.errors} />
          <TextInput label="Current monthly support committed" name="currentMonthlySupportCommitted" type="number" errors={state.errors} />
        </div>
        <TextInput
          label="Goal basis"
          name="goalBasis"
          placeholder="Example: Based on the median household income in Lakeville, Minnesota."
          errors={state.errors}
        />
        <RadioGroup label="Should debt snapshot be visible?" name="showDebtSnapshot" options={["Yes", "No"]} errors={state.errors} />
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput label="Total debt amount, optional" name="totalDebtAmount" type="number" errors={state.errors} />
          <TextInput label="Monthly debt burden, optional" name="monthlyDebtBurden" type="number" errors={state.errors} />
          <TextInput label="Freedom goal date, optional" name="freedomGoalDate" type="date" errors={state.errors} />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 09" title="Current Needs">
        <div className="grid gap-5 md:grid-cols-2">
          <TextArea label="Monthly partners needed" name="monthlyPartnersNeeded" errors={state.errors} />
          <TextArea label="One-time needs" name="oneTimeNeeds" errors={state.errors} />
          <TextArea label="Travel needs" name="travelNeeds" errors={state.errors} />
          <TextArea label="Vehicle or housing needs" name="vehicleOrHousingNeeds" errors={state.errors} />
          <TextArea label="Technology or equipment needs" name="technologyOrEquipmentNeeds" errors={state.errors} />
          <TextArea label="Prayer needs" name="prayerNeeds" errors={state.errors} />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 10" title="Prayer Requests">
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Prayer request 1" name="prayerRequest1" errors={state.errors} />
          <TextInput label="Prayer request 2" name="prayerRequest2" errors={state.errors} />
          <TextInput label="Prayer request 3" name="prayerRequest3" errors={state.errors} />
          <TextInput label="Prayer request 4" name="prayerRequest4" errors={state.errors} />
        </div>
      </SectionCard>

      <SectionCard eyebrow="Section 11" title="Photos">
        <HelperText>
          Formspree supports file uploads on supported plans. If upload does not work, paste a Google Drive folder link below.
        </HelperText>
        <div className="grid gap-5 md:grid-cols-3">
          <FileInput label="Profile photo upload" name="profilePhoto" />
          <FileInput label="Family photo upload" name="familyPhoto" />
          <FileInput label="Ministry photo upload" name="ministryPhoto" />
        </div>
        <TextInput label="Google Drive folder link, optional" name="googleDriveFolderLink" type="url" errors={state.errors} />
      </SectionCard>

      <SectionCard eyebrow="Section 12" title="Profile Visibility">
        {/* Future: route these answers into an admin approval workflow. */}
        <RadioGroup label="Can this profile be public?" name="profileVisibility" options={yesNoReviewOptions} required errors={state.errors} />
        <RadioGroup label="Can we share your story publicly?" name="shareStoryPublicly" options={yesNoReviewOptions} errors={state.errors} />
        <RadioGroup label="Can we share family details publicly?" name="shareFamilyDetailsPublicly" options={yesNoReviewOptions} errors={state.errors} />
        <RadioGroup label="Can we share giving goal publicly?" name="shareGivingGoalPublicly" options={yesNoReviewOptions} errors={state.errors} />
        <RadioGroup label="Can we share testimonies publicly?" name="shareTestimoniesPublicly" options={yesNoReviewOptions} errors={state.errors} />
      </SectionCard>

      <SectionCard eyebrow="Section 13" title="Final Review">
        <TextArea
          label="Is there anything else we should know before building your profile?"
          name="anythingElse"
          errors={state.errors}
        />
      </SectionCard>

      <div className="sticky bottom-0 z-20 border border-stone-800/70 bg-[#050505]/95 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.4)] backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-stone-400">
            Required fields are marked with gold. Your answers can be reviewed before anything is published.
          </p>
          <button
            type="submit"
            disabled={state.submitting}
            className="inline-flex min-h-12 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-black transition-all duration-300 hover:bg-[#F5B942] hover:shadow-[0_0_22px_rgba(212,166,61,0.24)] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {state.submitting ? "Submitting..." : "Submit Profile Intake"}
          </button>
        </div>
      </div>
    </form>
  );
}

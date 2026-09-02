"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import {
  restorationFieldIsVisible,
  restorationPayloadVersion,
  restorationSectionCompletion,
  restorationSections,
  type RestorationField,
  type RestorationSection,
} from "@/src/lib/restoration/intake";
import { submitPublicForm } from "@/components/forms/submitPublicForm";
import { morColor, morFont, morRoutes } from "@/src/lib/mission-of-reconciliation/brand";

const storageKey = "usam-restoration-draft:2";

type FieldValue = boolean | string | string[];
type IntakeValues = Record<string, FieldValue>;
type SavedDraft = {
  submissionId?: string | null;
  submittedAt?: string | null;
  updatedAt: string;
  values: IntakeValues;
  version: number;
};
type SaveState = "idle" | "saved" | "saving" | "unsaved";
type SubmitState = "error" | "idle" | "submitting";

function fieldHasValue(field: RestorationField, values: IntakeValues) {
  const value = values[field.id];

  if (field.type === "checkbox") {
    return value === true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return `Saved ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function totalProgress(values: IntakeValues) {
  const totals = restorationSections.reduce((acc, section) => {
    const completion = restorationSectionCompletion(section, values);

    return {
      answered: acc.answered + completion.answered,
      total: acc.total + completion.total,
    };
  }, { answered: 0, total: 0 });

  return totals.total === 0 ? 0 : Math.round((totals.answered / totals.total) * 100);
}

function getTextValue(values: IntakeValues, fieldId: string) {
  const value = values[fieldId];

  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function nameParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

/** Only send answers whose field is actually visible for this person's path. */
function visibleValues(values: IntakeValues) {
  const visibleFieldIds = new Set(
    restorationSections.flatMap((section) => (
      section.fields
        .filter((field) => restorationFieldIsVisible(field, values))
        .map((field) => field.id)
    )),
  );

  return Object.fromEntries(
    Object.entries(values).filter(([fieldId]) => visibleFieldIds.has(fieldId)),
  ) as IntakeValues;
}

function requiredMissing(values: IntakeValues) {
  return restorationSections.flatMap((section) => (
    section.fields
      .filter((field) => restorationFieldIsVisible(field, values) && field.required && !fieldHasValue(field, values))
      .map((field) => ({ field, section }))
  ));
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`border bg-white ${className}`}
      style={{ borderColor: morColor.rule }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[11px] uppercase tracking-[0.14em]"
      style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

const inputClassName = "mt-2 min-h-12 w-full border px-4 py-3 text-base outline-none transition focus:ring-4";

function inputStyle() {
  return {
    backgroundColor: "#FFFFFF",
    borderColor: morColor.rule,
    color: morColor.ink,
  } as const;
}

function FieldControl({
  field,
  onChange,
  value,
}: {
  field: RestorationField;
  onChange: (value: FieldValue) => void;
  value: FieldValue | undefined;
}) {
  if (field.type === "checkbox") {
    return (
      <label
        className="flex min-h-12 items-start gap-3 border p-4 text-[15px] leading-7"
        style={{ backgroundColor: "#FFFFFF", borderColor: morColor.rule, color: morColor.body }}
      >
        <input
          checked={value === true}
          className="mt-1 h-4 w-4 shrink-0"
          onChange={(event) => onChange(event.target.checked)}
          style={{ accentColor: morColor.gold }}
          type="checkbox"
        />
        <span style={{ color: morColor.body }}>
          {field.label}
          {field.required ? <span style={{ color: morColor.goldInk }}> *</span> : null}
          {field.helper ? (
            <span className="mt-1.5 block text-[13px] leading-6" style={{ color: morColor.muted }}>
              {field.helper}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  if (field.type === "checkbox-group") {
    const selected = Array.isArray(value) ? value : [];

    return (
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="p-0">
          <FieldLabel>{field.label}</FieldLabel>
        </legend>
        {field.helper ? (
          <p className="mt-2 text-[13px] leading-6" style={{ color: morColor.muted }}>{field.helper}</p>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option);

            return (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-2.5 border px-3 py-2 text-[15px] leading-6 transition-colors focus-within:ring-4"
                key={option}
                style={{
                  backgroundColor: active ? "rgba(194,161,78,0.16)" : "#FFFFFF",
                  borderColor: active ? morColor.gold : morColor.rule,
                  color: morColor.body,
                }}
              >
                <input
                  checked={active}
                  className="h-4 w-4 shrink-0"
                  onChange={() => {
                    onChange(active ? selected.filter((item) => item !== option) : [...selected, option]);
                  }}
                  style={{ accentColor: morColor.gold }}
                  type="checkbox"
                />
                <span style={{ color: morColor.body }}>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="p-0">
          <FieldLabel>
            {field.label}
            {field.required ? " *" : ""}
          </FieldLabel>
        </legend>
        {field.helper ? (
          <p className="mt-2 text-[13px] leading-6" style={{ color: morColor.muted }}>{field.helper}</p>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const active = value === option;

            return (
              <label
                className="flex min-h-11 cursor-pointer items-center gap-2.5 border px-3 py-2 text-[15px] leading-6 transition-colors focus-within:ring-4"
                key={option}
                style={{
                  backgroundColor: active ? morColor.ink : "#FFFFFF",
                  borderColor: active ? morColor.ink : morColor.rule,
                  color: active ? "#FFFFFF" : morColor.body,
                }}
              >
                <input
                  checked={active}
                  className="h-4 w-4 shrink-0"
                  name={field.id}
                  onChange={() => onChange(option)}
                  style={{ accentColor: morColor.gold }}
                  type="radio"
                  value={option}
                />
                <span style={{ color: active ? "#FFFFFF" : morColor.body }}>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        <FieldLabel>
          {field.label}
          {field.required ? " *" : ""}
        </FieldLabel>
        {field.helper ? (
          <span className="mt-2 block text-[13px] leading-6" style={{ color: morColor.muted }}>{field.helper}</span>
        ) : null}
        <textarea
          className={`${inputClassName} min-h-32 leading-8`}
          onChange={(event) => onChange(event.target.value)}
          style={inputStyle()}
          value={typeof value === "string" ? value : ""}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <FieldLabel>
        {field.label}
        {field.required ? " *" : ""}
      </FieldLabel>
      {field.helper ? (
        <span className="mt-2 block text-[13px] leading-6" style={{ color: morColor.muted }}>{field.helper}</span>
      ) : null}
      <input
        autoComplete={field.type === "email" ? "email" : field.id === "participantPhone" ? "tel" : "off"}
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle()}
        type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
        value={typeof value === "string" ? value : ""}
      />
    </label>
  );
}

function EscalationNotice({ immediateDanger }: { immediateDanger: FieldValue | undefined }) {
  if (immediateDanger !== "Yes") {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 border p-4 text-[15px] leading-7"
      role="alert"
      style={{ backgroundColor: "#FDF2F2", borderColor: "#D98A8A", color: "#8A2B2B" }}
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <p style={{ color: "#8A2B2B" }}>
        Please pause here and reach out for immediate help right now &mdash; local emergency services,
        or call or text 988 in the United States. We want to walk with you, but this form is not an
        emergency response and no one is reading it in real time.
      </p>
    </div>
  );
}

function SectionStep({
  onBack,
  onNext,
  onUpdate,
  section,
  values,
}: {
  onBack: () => void;
  onNext: () => void;
  onUpdate: (fieldId: string, value: FieldValue) => void;
  section: RestorationSection;
  values: IntakeValues;
}) {
  const completion = restorationSectionCompletion(section, values);
  const visibleFields = section.fields.filter((field) => restorationFieldIsVisible(field, values));

  return (
    <Panel className="p-5 md:p-8">
      <div
        className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"
        style={{ borderColor: morColor.rule }}
      >
        <div className="min-w-0">
          <FieldLabel>{section.shortTitle}</FieldLabel>
          <h2
            className="mt-2 text-[1.75rem] leading-tight md:text-[2.25rem]"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            {section.title}
          </h2>
          {section.description ? (
            <p className="mt-3 max-w-2xl text-[15px] leading-7" style={{ color: morColor.muted }}>
              {section.description}
            </p>
          ) : null}
        </div>
        <p
          className="shrink-0 text-[11px] uppercase tracking-[0.14em]"
          style={{ color: morColor.muted, fontFamily: morFont.rajdhani, fontWeight: 700 }}
        >
          {completion.answered} of {completion.total} answered
        </p>
      </div>

      <div className="mt-7 grid gap-7">
        {section.id === "welcome" ? <EscalationNotice immediateDanger={values.immediateDanger} /> : null}
        {visibleFields.map((field) => (
          <FieldControl
            field={field}
            key={field.id}
            onChange={(value) => onUpdate(field.id, value)}
            value={values[field.id]}
          />
        ))}
      </div>

      <div
        className="mt-8 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between"
        style={{ borderColor: morColor.rule }}
      >
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-xs uppercase tracking-[0.16em]"
          onClick={onBack}
          style={{
            borderColor: morColor.rule,
            color: morColor.ink,
            fontFamily: morFont.rajdhani,
            fontWeight: 700,
          }}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </button>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 px-6 text-xs uppercase tracking-[0.16em]"
          onClick={onNext}
          style={{
            backgroundColor: morColor.ink,
            color: "#FFFFFF",
            fontFamily: morFont.rajdhani,
            fontWeight: 700,
          }}
          type="button"
        >
          {section.id === "additional" ? "Review" : "Next"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </Panel>
  );
}

function ReviewStep({
  isSubmitting,
  onEdit,
  onSubmit,
  submitError,
  submittedAt,
  values,
}: {
  isSubmitting: boolean;
  onEdit: (index: number) => void;
  onSubmit: () => void;
  submitError: string;
  submittedAt: string | null;
  values: IntakeValues;
}) {
  const missing = requiredMissing(values);
  const email = getTextValue(values, "participantEmail").toLowerCase();
  const hasValidEmail = isValidEmail(email);
  const inDanger = values.immediateDanger === "Yes";
  const canSubmit = !isSubmitting && missing.length === 0 && !inDanger && hasValidEmail;

  if (submittedAt) {
    return (
      <Panel className="p-8 text-center md:p-12">
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(194,161,78,0.18)", color: morColor.goldInk }}
        >
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2
          className="mt-6 text-[1.9rem] leading-tight md:text-[2.5rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          Thank you for trusting us with this.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-8" style={{ color: morColor.body }}>
          What you shared has been received. Someone from Mission of Reconciliation will reach out
          using the contact information you shared. In the meantime, you are not walking this alone,
          and Jesus is already at work in it.
        </p>
        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-8" style={{ color: morColor.muted }}>
          Your draft has been cleared from this device.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 md:p-8">
      <div className="border-b pb-6" style={{ borderColor: morColor.rule }}>
        <FieldLabel>Review</FieldLabel>
        <h2
          className="mt-2 text-[1.75rem] leading-tight md:text-[2.25rem]"
          style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
        >
          Review and send
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-7" style={{ color: morColor.muted }}>
          You can go back into any section before sending. Nothing here needs to be perfect.
        </p>
      </div>

      <ul className="mt-6 grid gap-3">
        {restorationSections.map((section, index) => {
          const completion = restorationSectionCompletion(section, values);
          const complete = completion.answered === completion.total;

          return (
            <li
              className="grid gap-3 border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={section.id}
              style={{ borderColor: morColor.rule }}
            >
              <div className="min-w-0">
                <p style={{ color: morColor.ink }}>{section.title}</p>
                <p className="mt-1 text-sm" style={{ color: morColor.muted }}>
                  {completion.answered} of {completion.total} answered
                  {complete ? " — complete" : ""}
                </p>
              </div>
              <button
                className="inline-flex min-h-10 items-center justify-center border px-4 text-xs uppercase tracking-[0.14em]"
                onClick={() => onEdit(index)}
                style={{
                  borderColor: morColor.rule,
                  color: morColor.ink,
                  fontFamily: morFont.rajdhani,
                  fontWeight: 700,
                }}
                type="button"
              >
                Edit<span className="sr-only"> {section.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="mt-6 grid gap-4">
        {missing.length ? (
          <p
            className="border p-4 text-[15px] leading-7"
            style={{ backgroundColor: "rgba(194,161,78,0.10)", borderColor: morColor.gold, color: "#5F4D25" }}
          >
            A few required items are still open in:{" "}
            {Array.from(new Set(missing.map((item) => item.section.title))).join(", ")}.
          </p>
        ) : null}
        {!hasValidEmail ? (
          <p
            className="border p-4 text-[15px] leading-7"
            style={{ backgroundColor: "rgba(194,161,78,0.10)", borderColor: morColor.gold, color: "#5F4D25" }}
          >
            Please add an email in the Welcome section so we can reach you.
          </p>
        ) : null}
        <EscalationNotice immediateDanger={values.immediateDanger} />
        {submitError ? (
          <p
            className="border p-4 text-[15px] leading-7"
            role="alert"
            style={{ backgroundColor: "#FDF2F2", borderColor: "#D98A8A", color: "#8A2B2B" }}
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="mt-8 border-t pt-6" style={{ borderColor: morColor.rule }}>
        <button
          className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 px-7 text-xs uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={{
            backgroundColor: morColor.gold,
            color: morColor.ink,
            fontFamily: morFont.rajdhani,
            fontWeight: 700,
          }}
          type="button"
        >
          {isSubmitting ? "Sending" : "Send to Mission of Reconciliation"}
        </button>
      </div>
    </Panel>
  );
}

export function RestorationIntakeClient() {
  const [values, setValues] = useState<IntakeValues>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const hydratedRef = useRef(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const progress = useMemo(() => totalProgress(values), [values]);
  const isReview = activeIndex === restorationSections.length;
  const currentSection = restorationSections[activeIndex];

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<SavedDraft>;
        setValues(parsed.values ?? {});
        setLastSavedAt(parsed.updatedAt ?? null);
        setSubmittedAt(parsed.submittedAt ?? null);
        setSaveState(parsed.updatedAt ? "saved" : "idle");
      } catch {
        setSaveState("idle");
      }
    }

    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    // Don't write (or claim to have written) a draft until the person has
    // actually answered something. Otherwise the panel reports "Saved" the
    // instant the page hydrates, before anyone has typed a word.
    if (!hydratedRef.current || submittedAt || Object.keys(values).length === 0) {
      return;
    }

    setSaveState("unsaved");
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      setSaveState("saving");
      window.localStorage.setItem(storageKey, JSON.stringify({
        submittedAt: null,
        updatedAt,
        values,
        version: restorationPayloadVersion,
      } satisfies SavedDraft));
      setLastSavedAt(updatedAt);
      setSaveState("saved");
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [submittedAt, values]);

  function goToSection(index: number) {
    setActiveIndex(index);
    headingRef.current?.scrollIntoView({ block: "start" });
  }

  function updateValue(fieldId: string, value: FieldValue) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  function saveNow() {
    const updatedAt = new Date().toISOString();
    window.localStorage.setItem(storageKey, JSON.stringify({
      submittedAt,
      updatedAt,
      values,
      version: restorationPayloadVersion,
    } satisfies SavedDraft));
    setLastSavedAt(updatedAt);
    setSaveState("saved");
  }

  async function submitReflection() {
    if (submitState === "submitting") {
      return;
    }

    const email = getTextValue(values, "participantEmail").toLowerCase();

    if (!isValidEmail(email)) {
      setSubmitError("Please add an email in the Welcome section so we can reach you.");
      setSubmitState("error");
      return;
    }

    const now = new Date().toISOString();
    const { firstName, lastName } = nameParts(getTextValue(values, "participantName"));
    const responseValues = visibleValues(values);

    setSubmitError("");
    setSubmitState("submitting");

    try {
      const result = await submitPublicForm({
        email,
        firstName,
        formType: "restoration",
        lastName,
        payload: {
          form: "restoration",
          submittedAt: now,
          values: responseValues,
          version: restorationPayloadVersion,
        },
        phone: getTextValue(values, "participantPhone"),
        priority: "high",
        sourcePage: morRoutes.restoration,
      });

      if (!result.ok || !result.id) {
        throw new Error("We could not send this just now. Please try again in a moment.");
      }

      window.localStorage.setItem(storageKey, JSON.stringify({
        submissionId: result.id,
        submittedAt: now,
        updatedAt: now,
        values: {},
        version: restorationPayloadVersion,
      } satisfies SavedDraft));
      setSubmittedAt(now);
      setLastSavedAt(now);
      setSaveState("saved");
      setSubmitState("idle");
      setValues({});
      headingRef.current?.scrollIntoView({ block: "start" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send this just now.");
      setSubmitState("error");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Panel className="p-5">
          <p
            className="text-[11px] uppercase tracking-[0.14em]"
            style={{ color: morColor.goldInk, fontFamily: morFont.rajdhani, fontWeight: 700 }}
          >
            Your progress
          </p>
          <p
            className="mt-2 text-[2rem] leading-none"
            style={{ color: morColor.ink, fontFamily: morFont.oswald, fontWeight: 600 }}
          >
            {progress}%
          </p>
          <div
            aria-label="Overall progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-4 h-1.5 w-full overflow-hidden"
            role="progressbar"
            style={{ backgroundColor: morColor.rule }}
          >
            <div className="h-full" style={{ backgroundColor: morColor.gold, width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-[13px] leading-6" style={{ color: morColor.muted }}>
            {saveState === "saving" ? "Saving" : saveState === "unsaved" ? "Unsaved changes" : formatSavedAt(lastSavedAt)}
          </p>
          <p className="mt-1 text-[13px] leading-6" style={{ color: morColor.muted }}>
            Saved on this device only. You can close this and come back.
          </p>
          {!submittedAt ? (
            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-xs uppercase tracking-[0.14em]"
              onClick={saveNow}
              style={{
                borderColor: morColor.rule,
                color: morColor.ink,
                fontFamily: morFont.rajdhani,
                fontWeight: 700,
              }}
              type="button"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Save now
            </button>
          ) : null}
        </Panel>

        <nav aria-label="Form sections" className="mt-4 hidden lg:grid lg:gap-1.5">
          {restorationSections.map((section, index) => {
            const completion = restorationSectionCompletion(section, values);
            const active = activeIndex === index;

            return (
              <button
                aria-current={active ? "step" : undefined}
                className="flex min-h-11 items-center justify-between gap-3 border px-3 text-left text-sm"
                key={section.id}
                onClick={() => goToSection(index)}
                style={{
                  backgroundColor: active ? "rgba(194,161,78,0.16)" : "#FFFFFF",
                  borderColor: active ? morColor.gold : morColor.rule,
                  color: morColor.ink,
                }}
                type="button"
              >
                <span className="min-w-0 truncate">{section.shortTitle}</span>
                <span className="shrink-0 text-xs" style={{ color: morColor.muted }}>
                  {completion.answered}/{completion.total}
                </span>
              </button>
            );
          })}
          <button
            aria-current={isReview ? "step" : undefined}
            className="flex min-h-11 items-center justify-between gap-3 border px-3 text-left text-sm"
            onClick={() => goToSection(restorationSections.length)}
            style={{
              backgroundColor: isReview ? morColor.ink : "#FFFFFF",
              borderColor: isReview ? morColor.ink : morColor.rule,
              color: isReview ? "#FFFFFF" : morColor.ink,
            }}
            type="button"
          >
            <span>Review and send</span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </nav>
      </aside>

      <div className="min-w-0" ref={headingRef}>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {restorationSections.map((section, index) => (
            <button
              aria-current={activeIndex === index ? "step" : undefined}
              className="inline-flex min-h-10 shrink-0 items-center border px-3 text-xs"
              key={section.id}
              onClick={() => goToSection(index)}
              style={{
                backgroundColor: activeIndex === index ? morColor.ink : "#FFFFFF",
                borderColor: activeIndex === index ? morColor.ink : morColor.rule,
                color: activeIndex === index ? "#FFFFFF" : morColor.ink,
              }}
              type="button"
            >
              {section.shortTitle}
            </button>
          ))}
          <button
            aria-current={isReview ? "step" : undefined}
            className="inline-flex min-h-10 shrink-0 items-center border px-3 text-xs"
            onClick={() => goToSection(restorationSections.length)}
            style={{
              backgroundColor: isReview ? morColor.ink : "#FFFFFF",
              borderColor: isReview ? morColor.ink : morColor.rule,
              color: isReview ? "#FFFFFF" : morColor.ink,
            }}
            type="button"
          >
            Review
          </button>
        </div>

        {isReview ? (
          <ReviewStep
            isSubmitting={submitState === "submitting"}
            onEdit={goToSection}
            onSubmit={submitReflection}
            submitError={submitError}
            submittedAt={submittedAt}
            values={values}
          />
        ) : currentSection ? (
          <SectionStep
            onBack={() => goToSection(Math.max(0, activeIndex - 1))}
            onNext={() => goToSection(Math.min(restorationSections.length, activeIndex + 1))}
            onUpdate={updateValue}
            section={currentSection}
            values={values}
          />
        ) : null}
      </div>
    </div>
  );
}

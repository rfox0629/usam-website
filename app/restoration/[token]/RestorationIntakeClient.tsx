"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  LockKeyhole,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  restorationPreviewAccessCode,
  restorationPreviewEmail,
  restorationSectionCompletion,
  restorationSections,
  type RestorationField,
  type RestorationSection,
} from "@/src/lib/restoration/intake";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const storageVersion = 1;

type FieldValue = boolean | string | string[];
type IntakeValues = Record<string, FieldValue>;
type SavedDraft = {
  submittedAt?: string | null;
  updatedAt: string;
  values: IntakeValues;
  version: number;
};
type SaveState = "idle" | "saved" | "saving" | "unsaved";

function storageKey(token: string) {
  return `usam-restoration-preview:${storageVersion}:${token}`;
}

function verificationKey(token: string) {
  return `usam-restoration-verified:${token}`;
}

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

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function totalProgress(values: IntakeValues) {
  const totals = restorationSections.reduce((acc, section) => {
    const completion = restorationSectionCompletion(section, values);

    return {
      answered: acc.answered + completion.answered,
      total: acc.total + completion.total,
    };
  }, { answered: 0, total: 0 });

  return Math.round((totals.answered / totals.total) * 100);
}

function requiredMissing(values: IntakeValues) {
  return restorationSections.flatMap((section) => (
    section.fields.filter((field) => field.required && !fieldHasValue(field, values)).map((field) => ({
      field,
      section,
    }))
  ));
}

function ShellCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#ded5c4] bg-white shadow-[0_24px_70px_rgba(47,37,18,0.10)] ${className}`}>
      {children}
    </div>
  );
}

function SmallLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.16em] text-[#75633d]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "amber" | "green" | "neutral" | "red" }) {
  const className = {
    amber: "border-[#C2A14E]/35 bg-[#C2A14E]/12 text-[#6f5415]",
    green: "border-green-600/25 bg-green-50 text-green-700",
    neutral: "border-[#ded5c4] bg-[#f7f4ec] text-[#5f5748]",
    red: "border-red-300 bg-red-50 text-red-700",
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function AccessGate({
  onVerified,
  token,
}: {
  onVerified: () => void;
  token: string;
}) {
  const [email, setEmail] = useState(restorationPreviewEmail);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const emailMatches = email.trim().toLowerCase() === restorationPreviewEmail;
    const codeMatches = accessCode.trim().toUpperCase() === restorationPreviewAccessCode;

    if (!emailMatches || !codeMatches) {
      setError("This preview invitation could not be verified.");
      return;
    }

    window.sessionStorage.setItem(verificationKey(token), "true");
    onVerified();
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] px-5 py-8 text-[#15120c]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)]">
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#15120c] text-[#C2A14E]">
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b7235]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Ministry of Reconciliation in partnership with USA Missionaries
          </p>
          <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.95] text-[#15120c] md:text-6xl" style={{ fontFamily: font.oswald }}>
            Secure Reflection
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#5f5748]">
            This doorway is private to the invited person. Verify the invitation before continuing.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusPill tone="amber">Referral R-208</StatusPill>
            <StatusPill>Expires in 14 days</StatusPill>
            <StatusPill>Revocable access</StatusPill>
          </div>
        </div>

        <ShellCard className="p-5 md:p-6">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div>
              <SmallLabel>Identity</SmallLabel>
              <input
                autoComplete="email"
                className="mt-2 min-h-12 w-full rounded-xl border border-[#d6ccb7] bg-[#fbfaf7] px-4 text-base text-[#15120c] outline-none transition focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>
            <div>
              <SmallLabel>Access Code</SmallLabel>
              <input
                autoComplete="one-time-code"
                className="mt-2 min-h-12 w-full rounded-xl border border-[#d6ccb7] bg-[#fbfaf7] px-4 text-base text-[#15120c] outline-none transition focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15"
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="MOR-PREVIEW"
                type="password"
                value={accessCode}
              />
            </div>
            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
            ) : null}
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15120c] px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#2d2617]"
              style={{ fontFamily: font.rajdhani }}
              type="submit"
            >
              Continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-4 rounded-xl border border-[#C2A14E]/35 bg-[#C2A14E]/10 p-3 text-xs leading-5 text-[#5f4d25]">
            Preview credentials: {restorationPreviewEmail} / {restorationPreviewAccessCode}. Do not enter real private details in this preview.
          </p>
        </ShellCard>
      </section>
    </main>
  );
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
  const commonInputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#d6ccb7] bg-[#fbfaf7] px-4 text-base text-[#15120c] outline-none transition placeholder:text-[#9c927f] focus:border-[#C2A14E] focus:ring-4 focus:ring-[#C2A14E]/15";

  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-[#ded5c4] bg-[#fbfaf7] p-3 text-sm leading-6 text-[#443c30]">
        <input
          checked={value === true}
          className="mt-1 h-4 w-4 shrink-0 accent-[#C2A14E]"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          {field.label}
          {field.required ? <span className="ml-1 text-[#8a5f00]">*</span> : null}
          {field.helper ? <span className="mt-1 block text-xs leading-5 text-[#7b7160]">{field.helper}</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "checkbox-group") {
    const selected = Array.isArray(value) ? value : [];

    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SmallLabel>{field.label}</SmallLabel>
          {field.contentReview ? <StatusPill tone="amber">Content Review</StatusPill> : null}
        </div>
        {field.helper ? <p className="mt-2 text-xs leading-5 text-[#7b7160]">{field.helper}</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option);

            return (
              <button
                aria-pressed={active}
                className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-sm leading-5 transition-colors ${
                  active
                    ? "border-[#C2A14E] bg-[#C2A14E]/16 text-[#15120c]"
                    : "border-[#ded5c4] bg-[#fbfaf7] text-[#4d4639] hover:border-[#C2A14E]/65"
                }`}
                key={option}
                onClick={() => {
                  onChange(active ? selected.filter((item) => item !== option) : [...selected, option]);
                }}
                type="button"
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${active ? "border-[#8f7023] bg-[#C2A14E]" : "border-[#b7ad98] bg-white"}`}>
                  {active ? <Check aria-hidden="true" className="h-3 w-3 text-[#15120c]" /> : null}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div>
        <SmallLabel>{field.label}{field.required ? " *" : ""}</SmallLabel>
        {field.helper ? <p className="mt-2 text-xs leading-5 text-[#7b7160]">{field.helper}</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(field.options ?? []).map((option) => {
            const active = value === option;

            return (
              <button
                aria-pressed={active}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[#15120c] bg-[#15120c] text-white"
                    : "border-[#ded5c4] bg-[#fbfaf7] text-[#4d4639] hover:border-[#C2A14E]/65"
                }`}
                key={option}
                onClick={() => onChange(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        <SmallLabel>{field.label}{field.required ? " *" : ""}</SmallLabel>
        {field.helper ? <span className="mt-2 block text-xs leading-5 text-[#7b7160]">{field.helper}</span> : null}
        <textarea
          className={`${commonInputClass} min-h-32 py-3 leading-7`}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === "string" ? value : ""}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <SmallLabel>{field.label}{field.required ? " *" : ""}</SmallLabel>
      {field.helper ? <span className="mt-2 block text-xs leading-5 text-[#7b7160]">{field.helper}</span> : null}
      <input
        className={commonInputClass}
        onChange={(event) => onChange(event.target.value)}
        type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
        value={typeof value === "string" ? value : ""}
      />
    </label>
  );
}

function SectionNav({
  activeIndex,
  onSelect,
  values,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
  values: IntakeValues;
}) {
  return (
    <nav className="grid gap-2" aria-label="Reflection sections">
      {restorationSections.map((section, index) => {
        const completion = restorationSectionCompletion(section, values);
        const complete = completion.answered === completion.total;
        const active = activeIndex === index;

        return (
          <button
            className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm transition-colors ${
              active
                ? "border-[#C2A14E] bg-[#C2A14E]/14 text-[#15120c]"
                : "border-[#ded5c4] bg-white text-[#5f5748] hover:border-[#C2A14E]/60"
            }`}
            key={section.id}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="min-w-0 truncate">{section.shortTitle}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs">
              {completion.answered}/{completion.total}
              {complete ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green-700" /> : null}
            </span>
          </button>
        );
      })}
      <button
        className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm transition-colors ${
          activeIndex === restorationSections.length
            ? "border-[#15120c] bg-[#15120c] text-white"
            : "border-[#ded5c4] bg-white text-[#5f5748] hover:border-[#C2A14E]/60"
        }`}
        onClick={() => onSelect(restorationSections.length)}
        type="button"
      >
        <span>Review</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  );
}

function EscalationNotice({ immediateDanger }: { immediateDanger: FieldValue | undefined }) {
  if (immediateDanger !== "Yes") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Please pause this form and contact local emergency help, a trusted leader, or a qualified care provider now. Restoration intake is not an emergency response.
        </p>
      </div>
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

  return (
    <ShellCard className="p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-[#ece5d8] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SmallLabel>{section.shortTitle}</SmallLabel>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#15120c]">{section.title}</h2>
          {section.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#675f51]">{section.description}</p> : null}
        </div>
        <StatusPill>{completion.answered}/{completion.total} answered</StatusPill>
      </div>

      {section.reviewNote ? (
        <div className="mt-5 rounded-2xl border border-[#C2A14E]/35 bg-[#C2A14E]/10 p-4 text-sm leading-6 text-[#5f4d25]">
          {section.reviewNote}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5">
        {section.id === "welcome" ? <EscalationNotice immediateDanger={values.immediateDanger} /> : null}
        {section.fields.map((field) => (
          <FieldControl
            field={field}
            key={field.id}
            onChange={(value) => onUpdate(field.id, value)}
            value={values[field.id]}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#ece5d8] pt-5 sm:flex-row sm:justify-between">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d6ccb7] px-4 text-xs font-bold uppercase tracking-[0.16em] text-[#15120c] transition-colors hover:border-[#C2A14E]"
          onClick={onBack}
          style={{ fontFamily: font.rajdhani }}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#15120c] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#2d2617]"
          onClick={onNext}
          style={{ fontFamily: font.rajdhani }}
          type="button"
        >
          {section.id === "additional" ? "Review" : "Next"}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </ShellCard>
  );
}

function ReviewStep({
  onEdit,
  onSubmit,
  submittedAt,
  values,
}: {
  onEdit: (index: number) => void;
  onSubmit: () => void;
  submittedAt: string | null;
  values: IntakeValues;
}) {
  const missing = requiredMissing(values);
  const canSubmit = missing.length === 0 && values.immediateDanger !== "Yes";

  if (submittedAt) {
    return (
      <ShellCard className="p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
          <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-3xl font-semibold text-[#15120c]">Reflection submitted</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#5f5748]">
          In production, this would lock participant editing, notify only authorized MOR operations staff without sensitive answers, and move the record to restricted review.
        </p>
        <StatusPill tone="green">Submitted {formatSavedAt(submittedAt)}</StatusPill>
      </ShellCard>
    );
  }

  return (
    <ShellCard className="p-5 md:p-6">
      <div className="border-b border-[#ece5d8] pb-5">
        <SmallLabel>Review</SmallLabel>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#15120c]">Review and Submit</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#675f51]">
          Review each section before submitting. Answer text stays hidden here by default for safer screenshots and review.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {restorationSections.map((section, index) => {
          const completion = restorationSectionCompletion(section, values);
          const complete = completion.answered === completion.total;

          return (
            <div className="grid gap-3 rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={section.id}>
              <div className="min-w-0">
                <p className="font-semibold text-[#15120c]">{section.title}</p>
                <p className="mt-1 text-sm text-[#675f51]">{completion.answered}/{completion.total} answered</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={complete ? "green" : "neutral"}>{complete ? "Complete" : "In Progress"}</StatusPill>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d6ccb7] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[#15120c] hover:border-[#C2A14E]"
                  onClick={() => onEdit(index)}
                  style={{ fontFamily: font.rajdhani }}
                  type="button"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {missing.length ? (
        <div className="mt-5 rounded-2xl border border-[#C2A14E]/35 bg-[#C2A14E]/10 p-4 text-sm leading-6 text-[#5f4d25]">
          Required items remaining: {missing.map((item) => item.section.shortTitle).join(", ")}.
        </div>
      ) : null}
      <EscalationNotice immediateDanger={values.immediateDanger} />

      <div className="mt-6 flex flex-col gap-3 border-t border-[#ece5d8] pt-5 sm:flex-row sm:justify-end">
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15120c] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#2d2617] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSubmit}
          onClick={onSubmit}
          style={{ fontFamily: font.rajdhani }}
          type="button"
        >
          Submit Reflection
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </ShellCard>
  );
}

export function RestorationIntakeClient({ token }: { token: string }) {
  const [verified, setVerified] = useState(false);
  const [values, setValues] = useState<IntakeValues>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const progress = useMemo(() => totalProgress(values), [values]);
  const isReview = activeIndex === restorationSections.length;
  const currentSection = restorationSections[activeIndex];

  useEffect(() => {
    setVerified(window.sessionStorage.getItem(verificationKey(token)) === "true");

    const raw = window.localStorage.getItem(storageKey(token));

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
  }, [token]);

  useEffect(() => {
    if (!verified || !hydratedRef.current || submittedAt) {
      return;
    }

    setSaveState("unsaved");
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      setSaveState("saving");
      window.localStorage.setItem(storageKey(token), JSON.stringify({
        submittedAt: null,
        updatedAt,
        values,
        version: storageVersion,
      } satisfies SavedDraft));
      setLastSavedAt(updatedAt);
      setSaveState("saved");
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [submittedAt, token, values, verified]);

  function updateValue(fieldId: string, value: FieldValue) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  function saveNow() {
    const updatedAt = new Date().toISOString();
    window.localStorage.setItem(storageKey(token), JSON.stringify({
      submittedAt,
      updatedAt,
      values,
      version: storageVersion,
    } satisfies SavedDraft));
    setLastSavedAt(updatedAt);
    setSaveState("saved");
  }

  function submitReflection() {
    const now = new Date().toISOString();
    window.localStorage.setItem(storageKey(token), JSON.stringify({
      submittedAt: now,
      updatedAt: now,
      values,
      version: storageVersion,
    } satisfies SavedDraft));
    setSubmittedAt(now);
    setLastSavedAt(now);
    setSaveState("saved");
  }

  if (!verified) {
    return <AccessGate onVerified={() => setVerified(true)} token={token} />;
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 text-[#15120c] md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <ShellCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15120c] text-[#C2A14E]">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <SmallLabel>Private Reflection</SmallLabel>
                <h1 className="mt-1 text-2xl font-semibold leading-none text-[#15120c]" style={{ fontFamily: font.oswald }}>
                  Your Path to Freedom
                </h1>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <StatusPill tone="amber">Preview Only</StatusPill>
              <StatusPill>{progress}% complete</StatusPill>
              <StatusPill>
                <Clock aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                {saveState === "saving" ? "Saving" : saveState === "unsaved" ? "Unsaved" : formatSavedAt(lastSavedAt)}
              </StatusPill>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e7decd]">
              <div className="h-full rounded-full bg-[#C2A14E]" style={{ width: `${progress}%` }} />
            </div>

            <button
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#d6ccb7] px-3 text-xs font-bold uppercase tracking-[0.16em] text-[#15120c] transition-colors hover:border-[#C2A14E]"
              onClick={saveNow}
              style={{ fontFamily: font.rajdhani }}
              type="button"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Save
            </button>
          </ShellCard>

          <div className="mt-4 hidden lg:block">
            <SectionNav activeIndex={activeIndex} onSelect={setActiveIndex} values={values} />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {restorationSections.map((section, index) => (
              <button
                className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
                  activeIndex === index ? "border-[#15120c] bg-[#15120c] text-white" : "border-[#ded5c4] bg-white text-[#5f5748]"
                }`}
                key={section.id}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                {section.shortTitle}
              </button>
            ))}
            <button
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${
                isReview ? "border-[#15120c] bg-[#15120c] text-white" : "border-[#ded5c4] bg-white text-[#5f5748]"
              }`}
              onClick={() => setActiveIndex(restorationSections.length)}
              type="button"
            >
              Review
            </button>
          </div>

          {isReview ? (
            <ReviewStep
              onEdit={setActiveIndex}
              onSubmit={submitReflection}
              submittedAt={submittedAt}
              values={values}
            />
          ) : currentSection ? (
            <SectionStep
              onBack={() => setActiveIndex((current) => Math.max(0, current - 1))}
              onNext={() => setActiveIndex((current) => Math.min(restorationSections.length, current + 1))}
              onUpdate={updateValue}
              section={currentSection}
              values={values}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
